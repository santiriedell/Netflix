import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import Movie from './models/Movie.js';
import User from './models/User.js';

dotenv.config();

const VIDEO_BASE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const tmdbGenreCache = new Map();
const categoryRules = [
  { names: ['accion', 'action'], category: 'Acción' },
  { names: ['aventura', 'adventure'], category: 'Aventura' },
  { names: ['cienciaficcion', 'fantasia', 'scifi', 'fantasy'], category: 'Ciencia Ficción' },
  { names: ['comedia', 'comedy'], category: 'Comedia' },
  { names: ['drama'], category: 'Drama' },
  { names: ['suspense', 'suspenso', 'misterio', 'mystery', 'crimen', 'crime', 'thriller'], category: 'Suspenso' },
  { names: ['documental', 'documentary'], category: 'Documentales' },
  { names: ['terror', 'horror'], category: 'Terror' },
];

const mapCategory = (genres) => {
  const normalizedGenres = genres.map(normalizeTitle);
  return categoryRules.find((rule) =>
    rule.names.some((name) => normalizedGenres.includes(name))
  )?.category || null;
};

const getOmdbMetadata = async (movie) => {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return null;

  const query = movie.tmdbQuery || movie.title;
  const url = new URL('https://www.omdbapi.com/');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('t', query);
  url.searchParams.set('type', movie.mediaType === 'tv' ? 'series' : 'movie');
  url.searchParams.set('plot', 'full');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OMDb respondió con estado ${response.status}`);
  }

  const result = await response.json();
  if (result.Response === 'False') {
    if (result.Error?.toLowerCase().includes('api key')) {
      throw new Error('OMDb rechazó la API key; revisa OMDB_API_KEY en .env');
    }
    return null;
  }

  if (normalizeTitle(result.Title || '') !== normalizeTitle(query)) return null;

  const year = result.Year?.match(/\d{4}/)?.[0];
  return {
    coverImg: result.Poster && result.Poster !== 'N/A' ? result.Poster : null,
    bannerImg: null,
    description: result.Plot && result.Plot !== 'N/A' ? result.Plot : null,
    releaseYear: year ? Number(year) : null,
    category: result.Genre && result.Genre !== 'N/A'
      ? mapCategory(result.Genre.split(',').map((genre) => genre.trim()))
      : null,
  };
};

const normalizeTitle = (title) =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getTmdbMetadata = async (movie) => {
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

  if (!tmdbGenreCache.has(endpoint)) {
    const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/${endpoint}/list?language=es-ES`, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!genreResponse.ok) {
      throw new Error(`TMDb no pudo cargar géneros: estado ${genreResponse.status}`);
    }
    const { genres } = await genreResponse.json();
    tmdbGenreCache.set(endpoint, new Map(genres.map((genre) => [genre.id, genre.name])));
  }

  const genreNames = (match.genre_ids || [])
    .map((id) => tmdbGenreCache.get(endpoint).get(id))
    .filter(Boolean)
    .map((name) => normalizeTitle(name));
  const mappedCategory = mapCategory(genreNames);
  const releaseDate = match.release_date || match.first_air_date;

  return {
    coverImg: match.poster_path ? `${TMDB_IMAGE_BASE}/w500${match.poster_path}` : null,
    bannerImg: match.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${match.backdrop_path}` : null,
    description: match.overview || null,
    releaseYear: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    category: mappedCategory || null,
  };
};

const getMovieMetadata = async (movie) => {
  if (process.env.OMDB_API_KEY) {
    try {
      const metadata = await getOmdbMetadata(movie);
      if (metadata) return { ...metadata, source: 'OMDb' };
      console.warn(`⚠️  OMDb no encontró coincidencia exacta para: ${movie.title}`);
    } catch (error) {
      console.warn(`⚠️  OMDb falló para "${movie.title}": ${error.message}`);
    }
  }

  if (process.env.TMDB_READ_ACCESS_TOKEN) {
    const metadata = await getTmdbMetadata(movie);
    return metadata ? { ...metadata, source: 'TMDb' } : null;
  }

  return null;
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

const catalogoAdicional = [
  { title: 'Interstellar', mediaType: 'movie', description: 'Un piloto y un equipo de exploradores atraviesan un agujero de gusano en busca de un hogar para la humanidad.', releaseYear: 2014, category: 'Ciencia Ficción' },
  { title: 'Inception', mediaType: 'movie', description: 'Un especialista en robar secretos de los sueños recibe una misión casi imposible: implantar una idea en la mente de su objetivo.', releaseYear: 2010, category: 'Ciencia Ficción' },
  { title: 'The Dark Knight', mediaType: 'movie', description: 'Batman se enfrenta al Joker, un criminal que convierte Ciudad Gótica en un escenario de caos y pone a prueba los límites del héroe.', releaseYear: 2008, category: 'Acción' },
  { title: 'The Matrix', mediaType: 'movie', description: 'Un programador descubre que la realidad que conoce es una simulación y se une a una rebelión contra las máquinas.', releaseYear: 1999, category: 'Ciencia Ficción' },
  { title: 'Dune', mediaType: 'movie', description: 'Paul Atreides viaja al planeta más peligroso del universo para proteger el futuro de su familia y de su pueblo.', releaseYear: 2021, category: 'Aventura' },
  { title: 'Arrival', mediaType: 'movie', description: 'Una lingüista intenta comunicarse con visitantes extraterrestres mientras el mundo busca entender sus intenciones.', releaseYear: 2016, category: 'Ciencia Ficción' },
  { title: 'Coco', mediaType: 'movie', description: 'Miguel llega al mundo de los muertos durante una celebración familiar y descubre la historia que une a varias generaciones.', releaseYear: 2017, category: 'Aventura' },
  { title: 'Inside Out', mediaType: 'movie', description: 'Alegría, Tristeza y las demás emociones acompañan a Riley mientras se adapta a una nueva ciudad y a grandes cambios.', releaseYear: 2015, category: 'Aventura' },
  { title: 'Toy Story', mediaType: 'movie', description: 'Woody y Buzz deben dejar de competir y aprender a colaborar cuando una mudanza los aleja de su casa.', releaseYear: 1995, category: 'Aventura' },
  { title: 'The Shawshank Redemption', mediaType: 'movie', description: 'En prisión, Andy construye una amistad inesperada y conserva la esperanza mientras busca recuperar su libertad.', releaseYear: 1994, category: 'Drama' },
  { title: 'Forrest Gump', mediaType: 'movie', description: 'Forrest recorre momentos decisivos de la historia de Estados Unidos mientras intenta reencontrarse con su gran amor.', releaseYear: 1994, category: 'Drama' },
  { title: 'The Godfather', mediaType: 'movie', description: 'La familia Corleone enfrenta una disputa por el poder que cambiará para siempre el destino de Michael.', releaseYear: 1972, category: 'Drama' },
  { title: 'Breaking Bad', mediaType: 'tv', description: 'Un profesor de química toma decisiones cada vez más arriesgadas para asegurar el futuro de su familia.', releaseYear: 2008, category: 'Drama' },
  { title: 'Stranger Things', mediaType: 'tv', description: 'La desaparición de un chico revela experimentos secretos y una amenaza sobrenatural en un pequeño pueblo.', releaseYear: 2016, category: 'Ciencia Ficción' },
  { title: 'Dark', mediaType: 'tv', description: 'La desaparición de dos niños conecta a cuatro familias con un misterio que atraviesa varias generaciones.', releaseYear: 2017, category: 'Suspenso' },
  { title: 'The Mandalorian', mediaType: 'tv', description: 'Un cazarrecompensas solitario recorre la galaxia y protege a una criatura que cambiará su camino.', releaseYear: 2019, category: 'Ciencia Ficción' },
  { title: 'The Last of Us', mediaType: 'tv', description: 'Joel y Ellie cruzan un mundo devastado mientras forman un vínculo que pone a prueba sus decisiones.', releaseYear: 2023, category: 'Drama' },
  { title: 'Wednesday', mediaType: 'tv', description: 'Merlina Addams investiga una serie de ataques y secretos familiares durante su estancia en la Academia Nunca Más.', releaseYear: 2022, category: 'Suspenso' },
  { title: 'One Piece', mediaType: 'tv', description: 'Monkey D. Luffy reúne una tripulación y se lanza al mar en busca del tesoro que puede convertirlo en rey de los piratas.', releaseYear: 2023, category: 'Aventura' },
  { title: 'The Crown', mediaType: 'tv', description: 'La vida de Isabel II y su familia se entrelaza con los cambios políticos y sociales del Reino Unido.', releaseYear: 2016, category: 'Drama' },
].map((movie, index) => ({
  ...movie,
  tmdbQuery: movie.title,
  coverImg: `https://picsum.photos/seed/maqui-${index}/300/450`,
  bannerImg: `https://picsum.photos/seed/maqui-banner-${index}/1600/900`,
  videoUrl: `${VIDEO_BASE}/BigBuckBunny.mp4`,
  duration: 0,
}));

const catalogoNuevo = [
  { title: 'Gladiator', mediaType: 'movie', description: 'Un general romano traicionado busca justicia en la arena y desafía el poder del emperador.', releaseYear: 2000, category: 'Acción' },
  { title: 'Oppenheimer', mediaType: 'movie', description: 'El físico J. Robert Oppenheimer lidera el proyecto que desarrolla la primera bomba atómica y enfrenta sus consecuencias.', releaseYear: 2023, category: 'Drama' },
  { title: 'Barbie', mediaType: 'movie', description: 'Una muñeca deja Barbieland para descubrir quién es y qué significa vivir en el mundo real.', releaseYear: 2023, category: 'Comedia' },
  { title: 'Whiplash', mediaType: 'movie', description: 'Un joven baterista persigue la excelencia bajo la exigencia extrema de un profesor implacable.', releaseYear: 2014, category: 'Drama' },
  { title: 'Parasite', mediaType: 'movie', description: 'Dos familias de mundos opuestos quedan unidas por un plan que cambia de rumbo de forma inesperada.', releaseYear: 2019, category: 'Suspenso' },
  { title: 'Jurassic Park', mediaType: 'movie', description: 'Un parque de dinosaurios recreados por ingeniería genética pierde el control durante una visita de prueba.', releaseYear: 1993, category: 'Aventura' },
  { title: 'John Wick', mediaType: 'movie', description: 'Un antiguo asesino vuelve al mundo criminal y pone en marcha una persecución que atraviesa la ciudad.', releaseYear: 2014, category: 'Acción' },
  { title: 'Mad Max: Fury Road', mediaType: 'movie', description: 'En un desierto sin ley, Max se une a Furiosa para ayudar a un grupo a escapar de un tirano.', releaseYear: 2015, category: 'Acción' },
  { title: 'Get Out', mediaType: 'movie', description: 'Una visita a la familia de su pareja lleva a Chris a descubrir una inquietante realidad detrás de las apariencias.', releaseYear: 2017, category: 'Terror' },
  { title: 'The Conjuring', mediaType: 'movie', description: 'Dos investigadores paranormales ayudan a una familia que enfrenta sucesos inexplicables en su casa.', releaseYear: 2013, category: 'Terror' },
  { title: 'La La Land', mediaType: 'movie', description: 'Una actriz y un músico persiguen sus sueños en Los Ángeles mientras intentan construir una vida juntos.', releaseYear: 2016, category: 'Drama' },
  { title: 'Ratatouille', mediaType: 'movie', description: 'Una rata apasionada por la cocina forma una alianza inesperada para abrirse camino en un restaurante parisino.', releaseYear: 2007, category: 'Comedia' },
  { title: 'Finding Nemo', mediaType: 'movie', description: 'Un pez payaso cruza el océano con una compañera muy particular para encontrar a su hijo perdido.', releaseYear: 2003, category: 'Aventura' },
  { title: 'The Office', mediaType: 'tv', description: 'La rutina de una oficina toma giros absurdos bajo la mirada de un jefe que siempre busca ser el centro.', releaseYear: 2005, category: 'Comedia' },
  { title: 'Sherlock', mediaType: 'tv', description: 'Sherlock Holmes y John Watson resuelven crímenes complejos en el Londres contemporáneo.', releaseYear: 2010, category: 'Suspenso' },
  { title: 'The Bear', mediaType: 'tv', description: 'Un joven chef vuelve a Chicago para hacerse cargo del restaurante familiar y de un equipo bajo presión.', releaseYear: 2022, category: 'Drama' },
  { title: 'Arcane', mediaType: 'tv', description: 'Dos hermanas quedan en bandos opuestos mientras crece el conflicto entre una ciudad próspera y su zona subterránea.', releaseYear: 2021, category: 'Ciencia Ficción' },
  { title: 'Squid Game', mediaType: 'tv', description: 'Personas endeudadas aceptan competir en juegos infantiles con un premio enorme y consecuencias mortales.', releaseYear: 2021, category: 'Suspenso' },
  { title: 'House of the Dragon', mediaType: 'tv', description: 'La familia Targaryen se divide en una lucha por la sucesión que amenaza con incendiar Poniente.', releaseYear: 2022, category: 'Aventura' },
  { title: 'Planet Earth', mediaType: 'tv', description: 'Una serie documental recorre ecosistemas del planeta y muestra la vida silvestre en distintos hábitats.', releaseYear: 2006, category: 'Documentales' },
].map((movie, index) => ({
  ...movie,
  tmdbQuery: movie.title,
  coverImg: `https://picsum.photos/seed/maqui-new-${index}/300/450`,
  bannerImg: `https://picsum.photos/seed/maqui-new-banner-${index}/1600/900`,
  videoUrl: `${VIDEO_BASE}/BigBuckBunny.mp4`,
  duration: 0,
}));

const movies = [...peliculasMarvel, ...miniseries, ...catalogoAdicional, ...catalogoNuevo];
let tmdbImagesApplied = 0;
let tmdbImageErrors = 0;
let omdbImagesApplied = 0;
let omdbImageErrors = 0;

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
      let metadata = null;
      try {
        metadata = await getMovieMetadata(movie);
        if (metadata?.source === 'OMDb') omdbImagesApplied += 1;
        if (metadata?.source === 'TMDb') tmdbImagesApplied += 1;
      } catch (error) {
        if (process.env.OMDB_API_KEY) omdbImageErrors += 1;
        else tmdbImageErrors += 1;
        console.error(`❌ No se pudieron consultar datos de "${movie.title}": ${error.message}`);
      }

      const { mediaType, tmdbQuery, ...movieData } = movie;
      await Movie.findOneAndUpdate(
        { title: movie.title },
        {
          ...movieData,
          coverImg: metadata?.coverImg || movie.coverImg,
          bannerImg: metadata?.bannerImg || (metadata?.source === 'OMDb' ? metadata.coverImg : null) || movie.bannerImg,
          description: movie.description || metadata?.description,
          releaseYear: metadata?.releaseYear || movie.releaseYear,
          category: createdCategories[metadata?.category || movie.category],
        },
        { new: true, upsert: true, runValidators: true }
      );
      console.log(`➕ Película: ${movie.title}`);
    }

    const demoEmail = 'demo@maqui.local';
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

    if (process.env.OMDB_API_KEY) {
      console.log(`🖼️  Títulos actualizados desde OMDb: ${omdbImagesApplied}/${movies.length}`);
      if (omdbImageErrors > 0) {
        console.warn(`⚠️  Fallaron ${omdbImageErrors} consultas a OMDb; revisa los errores anteriores.`);
      }
    }
    if (process.env.TMDB_READ_ACCESS_TOKEN) {
      console.log(`🖼️  Imágenes actualizadas desde TMDb: ${tmdbImagesApplied}/${movies.length}`);
      if (tmdbImageErrors > 0) {
        console.warn(`⚠️  Fallaron ${tmdbImageErrors} consultas a TMDb; revisa los errores anteriores.`);
      }
    }
    if (!process.env.OMDB_API_KEY && !process.env.TMDB_READ_ACCESS_TOKEN) {
      console.warn('⚠️  OMDB_API_KEY y TMDB_READ_ACCESS_TOKEN no están configurados; se conservaron las imágenes existentes.');
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