const rateLimit = require('express-rate-limit');

// Respostas no mesmo formato dos outros erros da API
const handler = (_req, res, _next, options) =>
  res.status(options.statusCode).json({ message: options.message });

/** Login/cadastro: no máximo 10 tentativas a cada 15 min por IP (contra força bruta) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  handler,
});

/** Limite geral da API: 300 requisições por minuto por IP */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT || 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Muitas requisições. Tente novamente em instantes.',
  handler,
});

module.exports = { authLimiter, apiLimiter };
