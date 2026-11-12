const CustomArt = require('../models/CustomArt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { storeImage } = require('../services/imageStorage');
const custom = require('../services/customProducts');

// GET /api/custom (público) — opções, preços e prazo
exports.get = asyncHandler(async (_req, res) => res.json(await custom.publicConfig()));

// GET /api/custom/admin (admin) — inclui opções desativadas
exports.adminGet = asyncHandler(async (_req, res) => res.json(await custom.getConfig()));

// PUT /api/custom (admin)
exports.update = asyncHandler(async (req, res) => res.json(await custom.saveConfig(req.body)));

// POST /api/custom/art (logado) — imagem do cliente, guardada em tamanho original para a impressão
exports.uploadArt = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Nenhuma imagem enviada.', 400);
  const url = await storeImage(req.file.buffer, { kind: 'personalizado' });
  await CustomArt.create({ user: req.user._id, url });
  res.status(201).json({ url });
});
