const User = require('../models/User');
const { asyncHandler, ApiError, signToken } = require('../utils/helpers');

const createAccount = async (body, role) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'name, email and password are required');
  }
  const { name, email, password } = body;
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    throw new ApiError(400, 'name, email and password are required');
  }
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  return User.create({ name: name.trim(), email: normalizedEmail, password, role });
};

const respondWithToken = (res, user, status = 200) =>
  res.status(status).json({ success: true, token: signToken(user), user: user.toSafeJSON() });

// POST /api/auth/register  (attendee)
exports.register = asyncHandler(async (req, res) => {
  const user = await createAccount(req.body, 'user');
  respondWithToken(res, user, 201);
});

// POST /api/auth/register-organizer  (needs the organizer secret key)
exports.registerOrganizer = asyncHandler(async (req, res) => {
  const expected = process.env.ORGANIZER_SECRET;
  if (!expected || !req.body || req.body.organizerKey !== expected) {
    throw new ApiError(403, 'Invalid organizer key');
  }
  const user = await createAccount(req.body, 'organizer');
  respondWithToken(res, user, 201);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new ApiError(400, 'email and password are required');
  }
  const { email, password } = req.body;
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    throw new ApiError(400, 'email and password are required');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    '+password +hash +salt'
  );
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.password) {
    user.password = password;
    user.hash = undefined;
    user.salt = undefined;
    await user.save();
  }
  respondWithToken(res, user);
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});
