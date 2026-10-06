import Category from '../models/Category.js';
import Movie from '../models/Movie.js';
import mongoose from 'mongoose';

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.status(200).json({ ok: true, count: categories.length, categories });
  } catch (error) {
    console.error('Error en getCategories:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'El id de la categoría no es válido' });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ ok: false, message: 'Categoría no encontrada' });
    }

    return res.status(200).json({ ok: true, category });
  } catch (error) {
    console.error('Error en getCategoryById:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    return res.status(201).json({ ok: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ ok: false, message: 'La categoría ya existe' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        ok: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    console.error('Error en createCategory:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'El id de la categoría no es válido' });
    }

    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ ok: false, message: 'Categoría no encontrada' });
    }

    return res.status(200).json({ ok: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ ok: false, message: 'La categoría ya existe' });
    }
    console.error('Error en updateCategory:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'El id de la categoría no es válido' });
    }

    const moviesInCategory = await Movie.countDocuments({ category: id });
    if (moviesInCategory > 0) {
      return res.status(400).json({
        ok: false,
        message: `No se puede eliminar: la categoría tiene ${moviesInCategory} película(s) asociada(s)`,
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ ok: false, message: 'Categoría no encontrada' });
    }

    return res.status(200).json({ ok: true, message: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error en deleteCategory:', error.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};