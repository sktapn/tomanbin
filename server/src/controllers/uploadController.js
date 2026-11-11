const multer = require('multer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { storeImage } = require('../services/imageStorage');

const MAX_MB = 5;

// Recebe o arquivo na memória (até 5 MB, 1 foto por vez)
const receive = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
}).single('image');

// Converte os erros do multer em mensagens amigáveis
exports.receive = (req, res, next) =>
  receive(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return next(new AppError(`A foto é maior que ${MAX_MB} MB.`, 400));
    if (err) return next(new AppError('Não foi possível ler a foto enviada.', 400));
    next();
  });

// POST /api/uploads/image  (admin) — devolve { url }
exports.image = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Nenhuma foto enviada (campo "image").', 400);
  const url = await storeImage(req.file.buffer);
  res.status(201).json({ url });
});
