const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const coupons = require('../services/coupons');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('./authController');

// GET /api/users  (admin)
exports.list = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

// GET /api/users/:id  (admin)
exports.getById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('Usuário não encontrado', 404);
  res.json(user);
});

// PUT /api/users/me  (logado) — altera nome e/ou senha
exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (req.body.name) user.name = req.body.name;
  if (req.body.password) {
    // Evita que alguém com o token roubado troque a senha sem saber a atual
    if (!(await user.comparePassword(req.body.currentPassword))) {
      throw new AppError('Senha atual incorreta', 400);
    }
    user.password = req.body.password; // hash no pre('save')
    user.passwordChangedAt = new Date(); // desconecta outros aparelhos (ex: token roubado)
    req.auditEvent = 'senha.alterada';
  }
  await user.save();
  // Trocou a senha: devolve um token novo para este aparelho continuar conectado
  const token = req.body.password ? signToken(user) : undefined;
  res.json({ ...user.toJSON(), ...(token && { token }) });
});

// PUT /api/users/:id  (admin) — altera nome/perfil
exports.update = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id) && req.body.role && req.body.role !== 'admin') {
    throw new AppError('Você não pode remover seu próprio acesso de admin', 400);
  }
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw new AppError('Usuário não encontrado', 404);
  res.json(user);
});

// DELETE /api/users/:id  (admin)
exports.remove = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw new AppError('Você não pode excluir a própria conta por aqui', 400);
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('Usuário não encontrado', 404);
  // Pedidos não pagos da conta: cancela e devolve estoque e cupom (os pagos ficam no histórico da loja)
  const pending = await Order.find({ user: user._id, status: 'pendente' });
  for (const order of pending) {
    const res = await Order.updateOne({ _id: order._id, status: 'pendente' }, { status: 'cancelado' });
    if (!res.modifiedCount) continue;
    for (const it of order.items) if (it.product) await Product.updateOne({ _id: it.product }, { $inc: { stock: it.quantity } });
    await coupons.releaseUse(order);
  }
  res.status(204).end();
});
