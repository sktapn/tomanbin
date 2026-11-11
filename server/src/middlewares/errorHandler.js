const mongoose = require('mongoose');

function notFound(req, res) {
  res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Erro interno do servidor';
  if (err.type === 'entity.parse.failed') message = 'JSON inválido no corpo da requisição';
  if (err.type === 'entity.too.large') message = 'Requisição grande demais';
  let details = err.details;

  // Erros de validação do Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = details[0].message;
  }
  // ID inválido (ex: /products/123)
  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = 'Identificador inválido';
  }
  // Chave única duplicada (ex: e-mail já cadastrado)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    message = field === 'email' ? 'Este e-mail já está cadastrado' : `Valor duplicado para ${field}`;
  }

  if (status >= 500 && !err.statusCode) {
    // Erro inesperado: registra no servidor, mas não mostra detalhes internos ao cliente
    if (process.env.NODE_ENV !== 'test') console.error(err);
    message = 'Erro interno do servidor';
    details = undefined;
  }

  res.status(status).json({ message, ...(details && { details }) });
}

module.exports = { notFound, errorHandler };
