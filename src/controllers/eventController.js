const Event = require('../models/Event');
const { asyncHandler, ApiError, isValidId } = require('../utils/helpers');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/events  -> public list of published events
// Query: ?search=&category=&upcoming=true&page=1&limit=10
exports.listEvents = asyncHandler(async (req, res) => {
  const { search, category, upcoming } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const filter = { status: 'published' };
  if (category) filter.category = category;
  if (upcoming !== 'false') filter.date = { $gte: new Date() };
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organizer', 'name'),
    Event.countDocuments(filter),
  ]);

  res.json({
    success: true,
    page,
    pages: Math.ceil(total / limit),
    total,
    count: events.length,
    events,
  });
});

// GET /api/events/:id  -> public event details
exports.getEvent = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid event id');
  const event = await Event.findById(req.params.id).populate('organizer', 'name email');
  if (!event || event.status === 'draft') throw new ApiError(404, 'Event not found');
  res.json({ success: true, event });
});
