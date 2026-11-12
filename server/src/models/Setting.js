const mongoose = require('mongoose');

/** Configurações da loja editáveis pelo painel (chave → valor) */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
