const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

// Tira da URL qualquer coisa que pareça segredo antes de gravar
const cleanPath = (url) => url.replace(/(token|password|senha|key)=[^&]*/gi, '$1=***');

const dbReady = () => mongoose.connection.readyState === 1;

function write(entry) {
  if (!module.exports.dbReady()) return; // sem banco (ex: testes): não grava
  AuditLog.create(entry).catch((err) => console.error('Auditoria:', err.message));
}

/**
 * Ao terminar cada resposta da API, registra:
 *  - toda requisição feita por um admin (leitura ou escrita)
 *  - eventos marcados pelos controllers em req.auditEvent (login, senha...)
 */
function auditTrail(req, res, next) {
  res.on('finish', () => {
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && !req.auditEvent) return;
    write({
      event: req.auditEvent || 'admin.acesso',
      actor: req.user?._id,
      role: req.user?.role,
      email: req.auditEmail,
      method: req.method,
      path: cleanPath(req.originalUrl).slice(0, 300),
      status: res.statusCode,
      ip: req.ip,
      userAgent: String(req.get('user-agent') || '').slice(0, 200),
    });
  });
  next();
}

module.exports = { auditTrail, cleanPath, dbReady };
