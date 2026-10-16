require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET in environment (.env). Copy .env.example to .env first.');
    process.exit(1);
  }
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/event_registration');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
