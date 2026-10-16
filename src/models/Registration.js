const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    // Details from the registration form
    attendeeName: { type: String, required: true, trim: true, maxlength: 80 },
    attendeeEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, maxlength: 30 },
    tickets: { type: Number, default: 1, min: 1, max: 10 },
    notes: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

// One registration record per (user, event). Re-registering after a cancel reuses it.
registrationSchema.index({ user: 1, event: 1 }, { unique: true });
registrationSchema.index({ event: 1, status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
