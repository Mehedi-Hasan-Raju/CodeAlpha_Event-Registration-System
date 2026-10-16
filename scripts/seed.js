// Usage: npm run seed
// Creates an organizer account + a few sample events (safe to run multiple times).
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/event_registration');

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      name: 'Event Organizer',
      email,
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
      role: 'organizer',
    });
    console.log(`Created organizer: ${email}`);
  } else {
    console.log(`Organizer already exists: ${email}`);
  }

  if ((await Event.countDocuments({ organizer: admin._id })) === 0) {
    const day = 24 * 60 * 60 * 1000;
    const at = (d, h) => new Date(Date.now() + d * day + h * 60 * 60 * 1000);
    await Event.insertMany([
      {
        title: 'Web Development Bootcamp',
        description: 'A hands-on one-day workshop covering HTML, CSS, JavaScript and Node.js basics.',
        location: 'Dhaka Tech Hub',
        date: at(7, 10),
        capacity: 50,
        category: 'Workshop',
        price: 0,
        organizer: admin._id,
      },
      {
        title: 'Startup Pitch Night',
        description: 'Ten early-stage startups pitch to investors. Networking session follows.',
        location: 'Gulshan Convention Hall',
        date: at(14, 18),
        capacity: 120,
        category: 'Networking',
        price: 500,
        organizer: admin._id,
      },
      {
        title: 'AI & Machine Learning Meetup',
        description: 'Talks and live demos on practical machine learning for beginners.',
        location: 'Online (Zoom)',
        date: at(21, 16),
        capacity: 200,
        category: 'Meetup',
        price: 0,
        organizer: admin._id,
      },
    ]);
    console.log('Created 3 sample events');
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
