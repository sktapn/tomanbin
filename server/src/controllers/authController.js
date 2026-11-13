const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const email = require('../services/email');
const tpl = require('../services/emailTemplates');
const { siteUrl } = require('../config/site');
const maintenance = require('../services/maintenance');

// Loja em manutenção: só a conta de admin entra (cliente não loga, não pede nem troca senha)
const MAINTENANCE_MSG = 'A loja está em manutenção. Voltamos já!';
const blockedByMaintenance = async (user) => user?.role !== 'admin' && (await maintenance.getMaintenance()).enabled;

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

exports.signToken = signToken;

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
  req.auditEmail = email;
  // Mensagem genérica: não revela se o e-mail existe
  if (!user || !(await user.comparePassword(password))) {
    req.auditEvent = 'login.falhou';
    throw new AppError('E-mail ou senha incorretos', 401);
  }
  if (await blockedByMaintenance(user)) {
    req.auditEvent = 'login.bloqueado-manutencao';
    throw new AppError(MAINTENANCE_MSG, 503);
  }
  req.auditEvent = 'login.ok';
  req.user = user; // para a auditoria saber quem entrou
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
  req.auditEvent = 'senha.pedido-de-redefinicao';
  req.auditEmail = req.body.email;
  if (await blockedByMaintenance(user)) throw new AppError(MAINTENANCE_MSG, 503);
  if (!user) throw new AppError('Não encontramos uma conta com este e-mail. Confira se digitou certo ou crie uma conta.', 404);

  const token = crypto.randomBytes(32).toString('hex');
  await User.updateOne(
    { _id: user._id },
    { resetTokenHash: hashToken(token), resetTokenExpires: new Date(Date.now() + RESET_MINUTES * 60_000) }
  );
  const site = siteUrl();
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
  if (await blockedByMaintenance(user)) throw new AppError(MAINTENANCE_MSG, 503);

  user.password = req.body.password; // hash no pre('save')
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.passwordChangedAt = new Date(); // desconecta sessões antigas
  await user.save();
  req.auditEvent = 'senha.redefinida';
  req.user = user;
  res.json({ token: signToken(user), user });
});
