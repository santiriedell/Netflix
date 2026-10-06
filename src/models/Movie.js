import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título de la película es obligatorio'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
    },
    coverImg: {
      type: String,
      required: [true, 'La URL de la portada es obligatoria'],
      trim: true,
    },
    bannerImg: {
      type: String,
      required: [true, 'La URL del banner es obligatoria'],
      trim: true,
    },
    videoUrl: {
      type: String,
      required: [true, 'La URL del video/trailer es obligatoria'],
      trim: true,
    },
    duration: {
      type: Number,
      min: [0, 'La duración no puede ser negativa'],
      default: 0,
    },
    releaseYear: {
      type: Number,
      required: [true, 'El año de estreno es obligatorio'],
      min: 1888,
      max: new Date().getFullYear() + 5,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La categoría es obligatoria'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Movie = mongoose.model('Movie', movieSchema);
export default Movie;