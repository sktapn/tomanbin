const User = require('../models/User');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

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
  }
  await user.save();
  res.json(user);
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
  await Order.deleteMany({ user: user._id, status: 'pendente' });
  res.status(204).end();
});
