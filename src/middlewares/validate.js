export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        ok: false,
        message: 'Error de validación',
        errors: error.details.map((detail) => detail.message),
      });
    }

    req[property] = value;
    return next();
  };
};