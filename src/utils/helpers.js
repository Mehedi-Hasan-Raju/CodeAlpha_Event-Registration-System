const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Wrap async route handlers so errors reach the error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Pick only whitelisted keys from an object (prevents mass assignment)
const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

module.exports = { asyncHandler, ApiError, signToken, isValidId, pick };
