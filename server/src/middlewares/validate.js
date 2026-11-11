const AppError = require('../utils/AppError');

/**
 * Valida req[source] com um schema Joi. O backend NÃO confia no frontend.
 * Campos desconhecidos são removidos (stripUnknown) — impede, por exemplo,
 * que alguém envie { role: 'admin' } no cadastro.
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      return next(new AppError(details[0].message, 400, details));
    }
    if (source === 'query') {
      // Express 4: req.query é getter; guardamos o valor validado à parte
      req.validatedQuery = value;
    } else {
      req[source] = value;
    }
    next();
  };
}

module.exports = validate;
