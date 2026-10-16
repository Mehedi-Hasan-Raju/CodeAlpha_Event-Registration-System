const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { asyncHandler, ApiError, isValidId, pick } = require('../utils/helpers');

const EVENT_FIELDS = ['title', 'description', 'location', 'date', 'capacity', 'category', 'price', 'status'];

// Organizers can only touch events they created
const findOwnEvent = async (id, user) => {
  if (!isValidId(id)) throw new ApiError(400, 'Invalid event id');
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (String(event.organizer) !== String(user._id)) {
    throw new ApiError(403, 'You can only manage your own events');
  }
  return event;
};

// POST /api/admin/events
exports.createEvent = asyncHandler(async (req, res) => {
  const data = pick(req.body, EVENT_FIELDS);
  const event = await Event.create({ ...data, organizer: req.user._id });
  res.status(201).json({ success: true, event });
});

// GET /api/admin/events  -> all events of this organizer (incl. drafts)
exports.myEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id }).sort({ date: -1 });
  res.json({ success: true, count: events.length, events });
});

// PUT /api/admin/events/:id
exports.updateEvent = asyncHandler(async (req, res) => {
  const event = await findOwnEvent(req.params.id, req.user);
  const data = pick(req.body, EVENT_FIELDS);

  if (data.capacity !== undefined && Number(data.capacity) < event.registeredCount) {
    throw new ApiError(400, `Capacity cannot be lower than current registrations (${event.registeredCount})`);
  }
  event.set(data);
  await event.save();
  res.json({ success: true, event });
});

// DELETE /api/admin/events/:id  -> removes the event and its registrations
exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await findOwnEvent(req.params.id, req.user);
  await Registration.deleteMany({ event: event._id });
  await event.deleteOne();
  res.json({ success: true, message: 'Event and its registrations deleted' });
});

// GET /api/admin/events/:id/registrations  (?status=registered|cancelled)
exports.eventRegistrations = asyncHandler(async (req, res) => {
  const event = await findOwnEvent(req.params.id, req.user);
  const filter = { event: event._id };
  if (['registered', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;

  const registrations = await Registration.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email');
  res.json({ success: true, event: { id: event._id, title: event.title }, count: registrations.length, registrations });
});

// GET /api/admin/events/:id/registrations.csv
exports.exportRegistrationsCsv = asyncHandler(async (req, res) => {
  const event = await findOwnEvent(req.params.id, req.user);
  const rows = await Registration.find({ event: event._id }).sort({ createdAt: 1 });

  // Prefix risky leading characters so spreadsheets don't execute them as formulas
  const esc = (v) => {
    let s = v === undefined || v === null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ['Name', 'Email', 'Phone', 'Tickets', 'Status', 'Notes', 'Registered At'];
  const lines = [header.map(esc).join(',')].concat(
    rows.map((r) =>
      [r.attendeeName, r.attendeeEmail, r.phone, r.tickets, r.status, r.notes, r.createdAt.toISOString()]
        .map(esc)
        .join(',')
    )
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="registrations-${event._id}.csv"`);
  res.send(lines.join('\n'));
});

// PATCH /api/admin/registrations/:id/cancel  -> organizer cancels an attendee's registration
exports.cancelAttendeeRegistration = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid registration id');
  const reg = await Registration.findById(req.params.id);
  if (!reg) throw new ApiError(404, 'Registration not found');
  await findOwnEvent(reg.event, req.user);

  const updated = await Registration.findOneAndUpdate(
    { _id: reg._id, status: 'registered' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!updated) throw new ApiError(400, 'Registration is already cancelled');

  await Event.updateOne({ _id: reg.event }, { $inc: { registeredCount: -reg.tickets } });
  res.json({ success: true, message: 'Registration cancelled', registration: updated });
});

// GET /api/admin/stats  -> dashboard numbers
exports.stats = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id }).select('_id capacity registeredCount date');
  const ids = events.map((e) => e._id);
  const [activeRegs, cancelledRegs] = await Promise.all([
    Registration.countDocuments({ event: { $in: ids }, status: 'registered' }),
    Registration.countDocuments({ event: { $in: ids }, status: 'cancelled' }),
  ]);
  const now = new Date();
  res.json({
    success: true,
    stats: {
      totalEvents: events.length,
      upcomingEvents: events.filter((e) => e.date >= now).length,
      activeRegistrations: activeRegs,
      cancelledRegistrations: cancelledRegs,
      seatsBooked: events.reduce((n, e) => n + e.registeredCount, 0),
      totalCapacity: events.reduce((n, e) => n + e.capacity, 0),
    },
  });
});
