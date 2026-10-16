const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth');
const auth = require('../controllers/authController');
const events = require('../controllers/eventController');
const regs = require('../controllers/registrationController');
const admin = require('../controllers/adminController');

const router = express.Router();

// Brute-force protection on login / signup
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

// ---- Auth ----
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/register-organizer', authLimiter, auth.registerOrganizer);
router.post('/auth/login', authLimiter, auth.login);
router.get('/auth/me', protect, auth.me);

// ---- Public events ----
router.get('/events', events.listEvents);
router.get('/events/:id', events.getEvent);

// ---- Registrations (logged-in users) ----
router.post('/events/:id/register', protect, regs.registerForEvent);
router.get('/registrations/my', protect, regs.myRegistrations);
router.get('/registrations/:id', protect, regs.getMyRegistration);
router.delete('/registrations/:id', protect, regs.cancelRegistration);

// ---- Organizer admin panel API ----
const organizerOnly = [protect, authorize('organizer')];
router.get('/admin/stats', organizerOnly, admin.stats);
router.get('/admin/events', organizerOnly, admin.myEvents);
router.post('/admin/events', organizerOnly, admin.createEvent);
router.put('/admin/events/:id', organizerOnly, admin.updateEvent);
router.delete('/admin/events/:id', organizerOnly, admin.deleteEvent);
router.get('/admin/events/:id/registrations', organizerOnly, admin.eventRegistrations);
router.get('/admin/events/:id/registrations.csv', organizerOnly, admin.exportRegistrationsCsv);
router.patch('/admin/registrations/:id/cancel', organizerOnly, admin.cancelAttendeeRegistration);

module.exports = router;
