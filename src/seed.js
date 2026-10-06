import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import Movie from './models/Movie.js';
import User from './models/User.js';

dotenv.config();

const VIDEO_BASE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const normalizeTitle = (title) =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getTmdbImages = async (movie) => {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return null;

  const endpoint = movie.mediaType === 'tv' ? 'tv' : 'movie';
  const query = movie.tmdbQuery || movie.title;
  const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
  url.searchParams.set('query', query);
  url.searchParams.set('language', 'es-ES');
  url.searchParams.set('include_adult', 'false');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`TMDb respondió con estado ${response.status}`);
  }

  const { results } = await response.json();
  const match = results.find((result) => {
    const resultTitle = result.title || result.name;
    const originalTitle = result.original_title || result.original_name;
    return [resultTitle, originalTitle]
      .filter(Boolean)
      .some((candidate) => normalizeTitle(candidate) === normalizeTitle(query));
  });

  if (!match) return null;

  return {
    coverImg: match.poster_path ? `${TMDB_IMAGE_BASE}/w500${match.poster_path}` : null,
    bannerImg: match.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${match.backdrop_path}` : null,
  };
};

const categories = [
  'Acción',
  'Aventura',
  'Ciencia Ficción',
  'Comedia',
  'Drama',
  'Suspenso',
  'Documentales',
  'Terror',
];

const peliculasMarvel = [
  {
    title: 'Avengers: Endgame',
    mediaType: 'movie',
    description:
      'Tras los devastadores eventos de Infinity War, los Vengadores supervivientes intentan deshacer el chasquido de Thanos y restaurar el equilibrio del universo.',
    coverImg: 'https://picsum.photos/seed/endgame/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-endgame/1600/900',
    videoUrl: `${VIDEO_BASE}/BigBuckBunny.mp4`,
    duration: 181,
    releaseYear: 2019,
    category: 'Ciencia Ficción',
  },
  {
    title: 'Avengers: Infinity War',
    mediaType: 'movie',
    description:
      'Los Vengadores y sus aliados deben estar dispuestos a sacrificarlo todo en un intento de derrotar al poderoso Thanos antes de que destruya el universo.',
    coverImg: 'https://picsum.photos/seed/infinity/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-infinity/1600/900',
    videoUrl: `${VIDEO_BASE}/TearsOfSteel.mp4`,
    duration: 149,
    releaseYear: 2018,
    category: 'Ciencia Ficción',
  },
  {
    title: 'Captain America: The Winter Soldier',
    mediaType: 'movie',
    description:
      'Steve Rogers lucha contra la amenaza de un poderoso mercenario misterioso conocido como el Soldado del Invierno mientras HYDRA se infiltra en S.H.I.E.L.D.',
    coverImg: 'https://picsum.photos/seed/cap/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-cap/1600/900',
    videoUrl: `${VIDEO_BASE}/Sintel.mp4`,
    duration: 136,
    releaseYear: 2014,
    category: 'Acción',
  },
  {
    title: 'Spider-Man: No Way Home',
    mediaType: 'movie',
    description:
      'Tras los eventos de Far From Home, la identidad de Spider-Man queda expuesta y Peter Parker pide ayuda al Doctor Strange para arreglarlo.',
    coverImg: 'https://picsum.photos/seed/spiderman/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-spiderman/1600/900',
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    duration: 148,
    releaseYear: 2021,
    category: 'Ciencia Ficción',
  },
  {
    title: 'Black Panther',
    mediaType: 'movie',
    description:
      "T'Challa vuelve a Wakanda para asumir el trono, pero un viejo enemigo resurge con un plan para dividir al reino.",
    coverImg: 'https://picsum.photos/seed/blackpanther/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-blackpanther/1600/900',
    videoUrl: `${VIDEO_BASE}/ElephantsDream.mp4`,
    duration: 134,
    releaseYear: 2018,
    category: 'Acción',
  },
  {
    title: 'Guardians of the Galaxy',
    mediaType: 'movie',
    description:
      'Un grupo de inadaptados: un ladrón, dos mercenarios y un árbol parlante, unen fuerzas para salvar la galaxia de Ronan el Acusador.',
    coverImg: 'https://picsum.photos/seed/gotg/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-gotg/1600/900',
    videoUrl: `${VIDEO_BASE}/ForBiggerJoyrides.mp4`,
    duration: 121,
    releaseYear: 2014,
    category: 'Aventura',
  },
];

const miniseries = [
  {
    title: 'Lupin',
    mediaType: 'tv',
    description:
      'Inspirado en el famoso ladrón de guante blanco Arsène Lupin, Assane Diop planea vengarse de la familia que arruinó la vida de su padre.',
    coverImg: 'https://picsum.photos/seed/lupin/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-lupin/1600/900',
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    duration: 52,
    releaseYear: 2021,
    category: 'Suspenso',
  },
  {
    title: 'Gambito de Dama',
    mediaType: 'tv',
    tmdbQuery: 'The Queen’s Gambit',
    description:
      'La historia de una huérfana prodigio del ajedrez que lucha contra sus adicciones mientras asciende al estrellato en el mundo del juego.',
    coverImg: 'https://picsum.photos/seed/gambit/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-gambit/1600/900',
    videoUrl: `${VIDEO_BASE}/Sintel.mp4`,
    duration: 60,
    releaseYear: 2020,
    category: 'Drama',
  },
  {
    title: 'Chernobyl',
    mediaType: 'tv',
    description:
      'En abril de 1986, el desastre nuclear de Chernóbil expone las mentiras y el heroísmo que desencadenó la catástrofe más grande de la historia.',
    coverImg: 'https://picsum.photos/seed/chernobyl/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-chernobyl/1600/900',
    videoUrl: `${VIDEO_BASE}/TearsOfSteel.mp4`,
    duration: 60,
    releaseYear: 2019,
    category: 'Drama',
  },
  {
    title: 'Band of Brothers',
    mediaType: 'tv',
    description:
      'La aclamada miniserie sigue a la Compañía Easy del 506.º Regimiento en su jornada desde el entrenamiento hasta la invasión de Europa en la Segunda Guerra Mundial.',
    coverImg: 'https://picsum.photos/seed/band/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-band/1600/900',
    videoUrl: `${VIDEO_BASE}/ForBiggerMeltdowns.mp4`,
    duration: 60,
    releaseYear: 2001,
    category: 'Drama',
  },
  {
    title: 'The Night Manager',
    mediaType: 'tv',
    description:
      'Un exsoldado convertido en gerente de hotel nocturno es reclutado por una agente de inteligencia para infiltrarse en el círculo de un peligroso traficante de armas.',
    coverImg: 'https://picsum.photos/seed/nightmanager/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-nightmanager/1600/900',
    videoUrl: `${VIDEO_BASE}/BigBuckBunny.mp4`,
    duration: 60,
    releaseYear: 2016,
    category: 'Suspenso',
  },
  {
    title: 'Maid',
    mediaType: 'tv',
    description:
      'Una madre soltera deja atrás una vida de violencia doméstica y se abre paso limpiando casas para construir un futuro para su hija.',
    coverImg: 'https://picsum.photos/seed/maid/300/450',
    bannerImg: 'https://picsum.photos/seed/banner-maid/1600/900',
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    duration: 50,
    releaseYear: 2021,
    category: 'Drama',
  },
];

const movies = [...peliculasMarvel, ...miniseries];
let tmdbImagesApplied = 0;
let tmdbImageErrors = 0;

const seed = async () => {
  try {
    console.log('🌱 Conectando a MongoDB...');
    await mongoose.connect(process.env.URI_LINK);

    const createdCategories = {};
    for (const name of categories) {
      const cat = await Category.findOneAndUpdate(
        { name },
        { $setOnInsert: { name } },
        { new: true, upsert: true, runValidators: true }
      );
      createdCategories[name] = cat._id;
      console.log(`➕ Categoría: ${name}`);
    }

    for (const movie of movies) {
      let images = null;
      if (process.env.TMDB_READ_ACCESS_TOKEN) {
        try {
          images = await getTmdbImages(movie);
          if (!images) {
            console.warn(`⚠️  TMDb no encontró un título exacto para: ${movie.title}`);
          } else {
            tmdbImagesApplied += 1;
          }
        } catch (error) {
          tmdbImageErrors += 1;
          console.error(`❌ No se pudieron consultar imágenes de "${movie.title}": ${error.message}`);
        }
      }

      const { mediaType, tmdbQuery, ...movieData } = movie;
      await Movie.findOneAndUpdate(
        { title: movie.title },
        {
          ...movieData,
          coverImg: images?.coverImg || movie.coverImg,
          bannerImg: images?.bannerImg || movie.bannerImg,
          category: createdCategories[movie.category],
        },
        { new: true, upsert: true, runValidators: true }
      );
      console.log(`➕ Película: ${movie.title}`);
    }

    const demoEmail = 'demo@bichiflix.com';
    const demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      await User.create({
        name: 'Gato',
        lastName: 'Demostración',
        email: demoEmail,
        password: 'miau123',
        avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=gato',
      });
      console.log(`➕ Usuario demo creado: ${demoEmail}`);
    } else {
      console.log(`ℹ️  Se conserva el usuario existente: ${demoEmail}`);
    }

    if (!process.env.TMDB_READ_ACCESS_TOKEN) {
      console.warn('⚠️  TMDB_READ_ACCESS_TOKEN no está configurado; se conservaron las imágenes existentes.');
    } else {
      console.log(`🖼️  Imágenes actualizadas desde TMDb: ${tmdbImagesApplied}/${movies.length}`);
      if (tmdbImageErrors > 0) {
        console.warn(`⚠️  Fallaron ${tmdbImageErrors} consultas a TMDb; revisa los errores anteriores.`);
      }
    }

    console.log('✅ Seed completado sin borrar datos existentes');
  } catch (error) {
    console.error('❌ Error durante el seed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();