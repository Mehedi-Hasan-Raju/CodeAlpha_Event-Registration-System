const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../utils/helpers');

// Requires a valid "Authorization: Bearer <token>" header
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Not authenticated. Please log in.');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired token. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'User no longer exists.');
  req.user = user;
  next();
});

// Role guard, use after protect
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

module.exports = { protect, authorize };
