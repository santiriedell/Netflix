import Movie from '../models/Movie.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';

export const getMovies = async (req, res) => {
  try {
    const { title = '', category = '', page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);

    const filter = {};

    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    if (category) {
      if (mongoose.isValidObjectId(category)) {
        filter.category = category;
      } else {
        const categoryDoc = await Category.findOne({ name: { $regex: category, $options: 'i' } });
        filter.category = categoryDoc?._id ?? null;
      }
    }

    if (filter.category === null) {
      return res.status(200).json({
        ok: true,
        count: 0,
        totalPages: 0,
        page: pageNumber,
        limit: limitNumber,
        movies: [],
      });
    }

    const total = await Movie.countDocuments(filter);

    const movies = await Movie.find(filter)
      .populate('category')
      .sort({ releaseYear: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    return res.status(200).json({
      ok: true,
      count: movies.length,
      total,
      totalPages: Math.ceil(total / limitNumber),
      page: pageNumber,
      limit: limitNumber,
      movies,
    });
  } catch (error) {
    console.error('Error en getMovies:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'El id de la película no es válido' });
    }

    const movie = await Movie.findById(id).populate('category');

    if (!movie) {
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });
    }

    return res.status(200).json({ ok: true, movie });
  } catch (error) {
    console.error('Error en getMovieById:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const createMovie = async (req, res) => {
  try {
    const movie = await Movie.create(req.body);
    const moviePopulated = await movie.populate('category');
    return res.status(201).json({ ok: true, movie: moviePopulated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        ok: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    console.error('Error en createMovie:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'El id de la película no es válido' });
    }

    const movie = await Movie.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category');

    if (!movie) {
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });
    }

    return res.status(200).json({ ok: true, movie });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        ok: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    console.error('Error en updateMovie:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'El id de la película no es válido' });
    }

    const movie = await Movie.findByIdAndDelete(id);

    if (!movie) {
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });
    }

    return res.status(200).json({ ok: true, message: 'Película eliminada correctamente' });
  } catch (error) {
    console.error('Error en deleteMovie:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};