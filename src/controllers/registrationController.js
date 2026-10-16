const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { asyncHandler, ApiError, isValidId, pick } = require('../utils/helpers');

// POST /api/events/:id/register  (logged-in user submits the registration form)
exports.registerForEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, 'Invalid event id');

  const event = await Event.findById(id);
  if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found');
  if (event.date < new Date()) throw new ApiError(400, 'This event has already taken place');

  const form = pick(req.body, ['attendeeName', 'attendeeEmail', 'phone', 'tickets', 'notes']);
  form.attendeeName = form.attendeeName || req.user.name;
  form.attendeeEmail = form.attendeeEmail || req.user.email;
  form.tickets = Number(form.tickets) || 1;
  if (form.tickets < 1 || form.tickets > 10) throw new ApiError(400, 'tickets must be between 1 and 10');

  const existing = await Registration.findOne({ user: req.user._id, event: id });
  if (existing && existing.status === 'registered') {
    throw new ApiError(409, 'You are already registered for this event');
  }

  // Atomically reserve seats; fails if there is not enough capacity left.
  const reserved = await Event.findOneAndUpdate(
    { _id: id, $expr: { $lte: [{ $add: ['$registeredCount', form.tickets] }, '$capacity'] } },
    { $inc: { registeredCount: form.tickets } },
    { new: true }
  );
  if (!reserved) throw new ApiError(409, 'Not enough seats left for this event');

  try {
    let registration;
    if (existing) {
      // Previously cancelled -> re-activate the same record
      Object.assign(existing, form, { status: 'registered', cancelledAt: undefined });
      registration = await existing.save();
    } else {
      registration = await Registration.create({ ...form, user: req.user._id, event: id });
    }
    res.status(201).json({ success: true, message: 'Registration successful', registration });
  } catch (err) {
    // Roll back the reserved seats if saving failed
    await Event.updateOne({ _id: id }, { $inc: { registeredCount: -form.tickets } });
    throw err;
  }
});

// GET /api/registrations/my  (?status=registered|cancelled)
exports.myRegistrations = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (['registered', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;

  const registrations = await Registration.find(filter)
    .sort({ createdAt: -1 })
    .populate('event', 'title date location status category price');

  res.json({ success: true, count: registrations.length, registrations });
});

// GET /api/registrations/:id
exports.getMyRegistration = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid registration id');
  const registration = await Registration.findOne({ _id: req.params.id, user: req.user._id }).populate(
    'event',
    'title date location status category price'
  );
  if (!registration) throw new ApiError(404, 'Registration not found');
  res.json({ success: true, registration });
});

// DELETE /api/registrations/:id  -> cancel own registration (soft cancel, seats are released)
exports.cancelRegistration = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid registration id');

  // Conditional update makes cancelling idempotent and race-safe
  const registration = await Registration.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'registered' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );

  if (!registration) {
    const exists = await Registration.exists({ _id: req.params.id, user: req.user._id });
    if (!exists) throw new ApiError(404, 'Registration not found');
    throw new ApiError(400, 'Registration is already cancelled');
  }

  await Event.updateOne({ _id: registration.event }, { $inc: { registeredCount: -registration.tickets } });
  res.json({ success: true, message: 'Registration cancelled', registration });
});
