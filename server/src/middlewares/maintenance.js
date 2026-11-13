const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const maintenance = require('../services/maintenance');

/**
 * Recusa a ação enquanto a loja está em manutenção (o admin passa).
 * Em rotas com login, vem depois do protect para saber quem é.
 */
module.exports = asyncHandler(async (req, _res, next) => {
  if (req.user?.role === 'admin') return next();
  const { enabled } = await maintenance.getMaintenance();
  if (enabled) throw new AppError('A loja está em manutenção. Voltamos já!', 503);
  next();
});
