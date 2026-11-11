// Evita try/catch repetido nos controllers: erros vão direto pro errorHandler
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
