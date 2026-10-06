import jwt from 'jsonwebtoken';
import Movie from '../models/Movie.js';
import User from '../models/User.js';

const signToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sendUserResponse = (user, res, statusCode = 200) => {
  const token = signToken(user);
  return res.status(statusCode).json({
    ok: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      myList: user.myList,
    },
  });
};

export const signUp = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'Ya existe una cuenta con ese email' });
    }

    const user = await User.create({
      name: req.body.name,
      lastName: req.body.lastName,
      email,
      password: req.body.password,
      avatarUrl: req.body.avatarUrl || '',
    });

    return sendUserResponse(user, res, 201);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Ya existe una cuenta con ese email' });
    }
    console.error('Error en signUp:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const signIn = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ ok: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: 'Credenciales inválidas' });
    }

    return sendUserResponse(user, res, 200);
  } catch (error) {
    console.error('Error en signIn:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const getMyList = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('myList');

    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ ok: true, myList: user.myList });
  } catch (error) {
    console.error('Error en getMyList:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const addToMyList = async (req, res) => {
  try {
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ ok: false, message: 'El id de la película es obligatorio' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });
    }

    if (user.myList.some((id) => id.toString() === movieId)) {
      return res.status(200).json({
        ok: true,
        message: 'La película ya está en tu lista',
        myList: user.myList,
      });
    }

    user.myList.push(movieId);
    await user.save();

    const populated = await user.populate('myList');
    return res.status(200).json({ ok: true, myList: populated.myList });
  } catch (error) {
    console.error('Error en addToMyList:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const removeFromMyList = async (req, res) => {
  try {
    const { movieId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    user.myList = user.myList.filter((id) => id.toString() !== movieId.toString());
    await user.save();

    const populated = await user.populate('myList');
    return res.status(200).json({ ok: true, myList: populated.myList });
  } catch (error) {
    console.error('Error en removeFromMyList:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};