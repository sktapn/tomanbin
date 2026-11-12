const mongoose = require('mongoose');

/**
 * Trilha de auditoria: quem acessou ou mudou o quê, quando e de onde.
 * Registra todas as ações de admins (inclusive leituras de dados de clientes)
 * e os eventos de conta (login certo/errado, troca e redefinição de senha).
 * Em caso de vazamento, é o que mostra o alcance exato. Apagado sozinho após 180 dias.
 */
const auditSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now, index: { expires: '180d' } },
    event: { type: String, required: true }, // ex: "admin.acesso", "login.falhou"
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    email: String, // só nos eventos de login (quem tentou)
    method: String,
    path: String,
    status: Number,
    ip: String,
    userAgent: String,
  },
  { versionKey: false }
);

module.exports = mongoose.model('AuditLog', auditSchema);
