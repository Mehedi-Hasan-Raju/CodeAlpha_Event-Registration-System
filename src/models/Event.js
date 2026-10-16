const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    date: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    // Kept in sync atomically by the registration controller
    registeredCount: { type: Number, default: 0, min: 0 },
    category: { type: String, trim: true, default: 'General' },
    price: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['published', 'draft', 'cancelled'], default: 'published' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

eventSchema.virtual('seatsLeft').get(function () {
  return Math.max(this.capacity - this.registeredCount, 0);
});

eventSchema.index({ date: 1 });
eventSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('Event', eventSchema);
