import Joi from 'joi';

export const signUpSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'El nombre es obligatorio',
    'string.min': 'El nombre debe tener al menos {#limit} caracteres',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'El apellido es obligatorio',
    'string.min': 'El apellido debe tener al menos {#limit} caracteres',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Formato de email inválido',
    'string.empty': 'El email es obligatorio',
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'La contraseña debe tener al menos {#limit} caracteres',
    'string.empty': 'La contraseña es obligatoria',
  }),
  avatarUrl: Joi.string().uri().allow('').optional().messages({
    'string.uri': 'La URL del avatar debe ser válida',
  }),
});

export const signInSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Formato de email inválido',
    'string.empty': 'El email es obligatorio',
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'La contraseña debe tener al menos {#limit} caracteres',
    'string.empty': 'La contraseña es obligatoria',
  }),
});

export const movieIdSchema = Joi.object({
  movieId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'El id de la película no es válido',
    'string.length': 'El id de la película no es válido',
  }),
});