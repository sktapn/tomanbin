const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const email = require('../services/email');
const tpl = require('../services/emailTemplates');

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

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
const RESET_MINUTES = 60;

// POST /api/auth/forgot-password — manda o link por e-mail.
// Avisa quando o e-mail não tem conta (decisão da loja: mais fácil para o cliente).
// O limite de tentativas por IP (authLimiter) impede que alguém use isso para testar e-mails em massa.
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw new AppError('Não encontramos uma conta com este e-mail. Confira se digitou certo ou crie uma conta.', 404);

  const token = crypto.randomBytes(32).toString('hex');
  await User.updateOne(
    { _id: user._id },
    { resetTokenHash: hashToken(token), resetTokenExpires: new Date(Date.now() + RESET_MINUTES * 60_000) }
  );
  const site = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const result = await email.sendEmail({ to: user.email, ...tpl.passwordReset(user, `${site}/redefinir-senha?token=${token}`) });
  if (result?.error) throw new AppError('Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.', 502);
  res.json({ message: 'Enviamos um link para criar uma senha nova. Ele vale por 1 hora.' });
});

// POST /api/auth/reset-password — troca a senha com o token do e-mail (uso único, 1 hora)
exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetTokenHash: hashToken(req.body.token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+password');
  if (!user) throw new AppError('Link inválido ou expirado. Peça um novo.', 400);

  user.password = req.body.password; // hash no pre('save')
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.passwordChangedAt = new Date(); // desconecta sessões antigas
  await user.save();
  res.json({ token: signToken(user), user });
});
