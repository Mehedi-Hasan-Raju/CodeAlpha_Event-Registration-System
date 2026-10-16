const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    hash: { type: String, select: false },
    salt: { type: String, select: false },
    // "user" = attendee, "organizer" = admin panel access
    role: { type: String, enum: ['user', 'organizer'], default: 'user' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (plain) {
  if (typeof plain !== 'string') return false;
  if (typeof this.password === 'string' && this.password) {
    return bcrypt.compare(plain, this.password);
  }
  if (
    typeof this.hash !== 'string' ||
    !/^[a-f\d]{1024}$/i.test(this.hash) ||
    typeof this.salt !== 'string' ||
    !this.salt
  ) {
    return false;
  }

  const expected = Buffer.from(this.hash, 'hex');
  const actual = await pbkdf2(plain, this.salt, 10000, 512, 'sha512');
  return crypto.timingSafeEqual(actual, expected);
};

userSchema.methods.toSafeJSON = function () {
  return { id: this._id, name: this.name, email: this.email, role: this.role };
};

module.exports = mongoose.model('User', userSchema);
