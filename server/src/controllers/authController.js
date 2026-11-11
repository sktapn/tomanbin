const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

// POST /api/auth/register — sempre cria como "user" (role vinda do front é descartada)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password, role: 'user' });
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Mensagem genérica: não revela se o e-mail existe
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('E-mail ou senha incorretos', 401);
  }
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me
exports.me = (req, res) => res.json({ user: req.user });
