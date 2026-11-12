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
  // só tentativas que DERAM ERRADO contam: vários logins certos na mesma rede (ex: escola) não bloqueiam ninguém
  skipSuccessfulRequests: true,
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

/** Cupons: 20 tentativas a cada 10 min por IP (evita adivinhar códigos) */
const couponLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.COUPON_RATE_LIMIT || 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Muitas tentativas de cupom. Aguarde alguns minutos.',
  handler,
});

module.exports = { authLimiter, apiLimiter, couponLimiter };
