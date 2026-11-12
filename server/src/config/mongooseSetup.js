/**
 * Regras globais do Mongoose (carregado antes dos models).
 *
 * Tempo máximo por consulta: uma busca pesada não pode travar o banco inteiro.
 * Leituras que passarem do limite são canceladas pelo próprio MongoDB.
 */
const mongoose = require('mongoose');

const MAX_MS = Number(process.env.DB_QUERY_TIMEOUT_MS || 5000);
const READS = ['find', 'findOne', 'countDocuments', 'distinct'];

mongoose.plugin((schema) => {
  schema.pre(READS, function setTimeout() {
    if (this.getOptions().maxTimeMS == null) this.maxTimeMS(MAX_MS);
  });
  schema.pre('aggregate', function setTimeout() {
    if (this.options.maxTimeMS == null) this.option({ maxTimeMS: MAX_MS });
  });
});

module.exports = { MAX_MS };
