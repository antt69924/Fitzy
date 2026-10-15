const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/errors');

function createToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) throw new AppError('Email is already registered', 409, 'EMAIL_IN_USE');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'customer' });
  return { user: user.toJSON(), token: createToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  const valid = user && await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS');
  if (user.isBlocked) throw new AppError('This account has been blocked', 403, 'ACCOUNT_BLOCKED');
  return { user: user.toJSON(), token: createToken(user) };
}

module.exports = { register, login };
