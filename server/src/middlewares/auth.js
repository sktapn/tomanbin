const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * AuthN — verifica o token JWT enviado em "Authorization: Bearer <token>"
 * e coloca o usuário em req.user.
 */
async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) throw new AppError('Você precisa estar logado', 401);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new AppError('Token inválido ou expirado', 401);
    }

    const user = await User.findById(payload.id);
    if (!user) throw new AppError('Usuário não encontrado', 401);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * AuthZ — libera a rota apenas para os papéis informados.
 * Uso: router.delete('/:id', protect, authorize('admin'), controller.remove)
 */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError('Você precisa estar logado', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Acesso negado: permissão insuficiente', 403));
    }
    next();
  };
}

/**
 * Auth opcional — se houver token válido, preenche req.user; senão segue como visitante.
 * Usado no catálogo (admin enxerga produtos inativos).
 */
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = await User.findById(payload.id);
    } catch {
      /* ignora token inválido */
    }
  }
  next();
}

module.exports = { protect, authorize, optionalAuth };
