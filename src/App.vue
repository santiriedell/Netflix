<script setup>
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
const movies = ref([]);
const categories = ref([]);
const selectedCategory = ref('');
const search = ref('');
const selectedMovie = ref(null);
const activeView = ref('catalog');
const loading = ref(true);
const error = ref('');
const token = ref(localStorage.getItem('maqui-token') || '');
const currentUser = ref(JSON.parse(localStorage.getItem('maqui-user') || 'null'));
const myList = ref([]);
const profileMenuOpen = ref(false);
const showAuth = ref(false);
const authMode = ref('signin');
const authError = ref('');
const authBusy = ref(false);
const authForm = ref({ name: '', lastName: '', email: '', password: '' });
let searchTimer;

const featuredMovie = computed(() => movies.value[0] || null);
const visibleMovies = computed(() => {
  if (activeView.value === 'mylist' || activeView.value === 'profile') return myList.value;
  return movies.value;
});
const recommendationRows = computed(() => [
  { title: 'Para una maratón de suspenso', categories: ['Suspenso'], accent: 'Tensión, misterio y secretos' },
  { title: 'Mundos que vale la pena explorar', categories: ['Ciencia Ficción', 'Aventura'], accent: 'Otros mundos, grandes viajes' },
  { title: 'Historias que se quedan con vos', categories: ['Drama', 'Comedia'], accent: 'Personajes para recordar' },
  { title: 'Acción para subir el ritmo', categories: ['Acción'], accent: 'Aventura en movimiento' },
].map((row) => ({
  ...row,
  movies: visibleMovies.value.filter((movie) => row.categories.includes(movie.category?.name)),
})).filter((row) => row.movies.length));
const showRecommendations = computed(() =>
  activeView.value === 'catalog' && !search.value.trim() && !selectedCategory.value
);

const showProfile = () => {
  profileMenuOpen.value = false;
  activeView.value = 'profile';
};

const signOut = () => {
  clearSession();
  profileMenuOpen.value = false;
  activeView.value = 'catalog';
};

const loadMovies = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [{ data: movieData }, { data: categoryData }] = await Promise.all([
      api.get('/movies', {
        params: {
          title: search.value.trim() || undefined,
          category: selectedCategory.value || undefined,
          limit: 100,
        },
      }),
      api.get('/categories'),
    ]);
    movies.value = movieData.movies || [];
    categories.value = categoryData.categories || [];
  } catch {
    error.value = 'No pudimos conectar con el catálogo. Revisá que la API esté iniciada.';
  } finally {
    loading.value = false;
  }
};

const loadMyList = async () => {
  if (!token.value) {
    showAuth.value = true;
    return;
  }
  try {
    const { data } = await api.get('/users/mylist', {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    myList.value = data.myList || [];
    activeView.value = 'mylist';
  } catch {
    clearSession();
    showAuth.value = true;
    authError.value = 'La sesión venció. Iniciá sesión de nuevo.';
  }
};

const clearSession = () => {
  token.value = '';
  currentUser.value = null;
  myList.value = [];
  localStorage.removeItem('maqui-token');
  localStorage.removeItem('maqui-user');
};

const toggleMyList = async (movie) => {
  if (!token.value) {
    showAuth.value = true;
    return;
  }
  const alreadySaved = myList.value.some((item) => item._id === movie._id);
  try {
    const config = { headers: { Authorization: `Bearer ${token.value}` } };
    if (alreadySaved) {
      await api.delete(`/users/mylist/${movie._id}`, config);
      myList.value = myList.value.filter((item) => item._id !== movie._id);
    } else {
      const { data } = await api.post('/users/mylist', { movieId: movie._id }, config);
      myList.value = data.myList || [...myList.value, movie];
    }
  } catch {
    error.value = 'No se pudo actualizar tu lista. Volvé a iniciar sesión.';
  }
};

const submitAuth = async () => {
  authBusy.value = true;
  authError.value = '';
  try {
    const endpoint = authMode.value === 'signin' ? '/auth/signin' : '/auth/signup';
    const body = authMode.value === 'signin'
      ? { email: authForm.value.email, password: authForm.value.password }
      : authForm.value;
    const { data } = await api.post(endpoint, body);
    token.value = data.token;
    currentUser.value = data.user;
    localStorage.setItem('maqui-token', data.token);
    localStorage.setItem('maqui-user', JSON.stringify(data.user));
    showAuth.value = false;
    authForm.value = { name: '', lastName: '', email: '', password: '' };
    if (activeView.value === 'mylist') await loadMyList();
  } catch (requestError) {
    authError.value = requestError.response?.data?.message || 'No se pudo iniciar la sesión.';
  } finally {
    authBusy.value = false;
  }
};

const updateSearch = () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadMovies, 250);
};

const goCatalog = () => {
  activeView.value = 'catalog';
  selectedCategory.value = '';
  loadMovies();
};

const isSaved = (movie) => myList.value.some((item) => item._id === movie._id);
const trailerSearchUrl = (movie) => {
  const query = `${movie.title} ${movie.releaseYear || ''} trailer oficial español`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
};

onMounted(async () => {
  await loadMovies();
  if (token.value) {
    try {
      const { data } = await api.get('/users/mylist', {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      myList.value = data.myList || [];
    } catch {
      clearSession();
    }
  }
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#inicio" @click.prevent="goCatalog" aria-label="MAQUI inicio">MAQUI<span>.</span></a>
      <nav class="main-nav" aria-label="Navegación principal">
        <button :class="{ active: activeView === 'catalog' }" @click="goCatalog">Explorar</button>
        <button :class="{ active: activeView === 'mylist' }" @click="loadMyList">Mi lista</button>
      </nav>
      <div class="top-actions">
        <label class="search-box">
          <span aria-hidden="true">⌕</span>
          <input v-model="search" placeholder="Buscar películas" aria-label="Buscar películas" @input="updateSearch" />
          <kbd>/</kbd>
        </label>
        <div v-if="currentUser" class="account-menu-wrap">
          <button class="account-button" :title="`Perfil de ${currentUser.name}`" :aria-expanded="profileMenuOpen" @click="profileMenuOpen = !profileMenuOpen">{{ currentUser.name?.slice(0, 1) || 'M' }}</button>
          <div v-if="profileMenuOpen" class="account-menu">
            <div class="account-menu-user"><strong>{{ currentUser.name }} {{ currentUser.lastName }}</strong><span>{{ currentUser.email }}</span></div>
            <button @click="showProfile">Mi perfil</button>
            <button @click="profileMenuOpen = false; loadMyList()">Mis guardados <span>{{ myList.length }}</span></button>
            <button class="account-logout" @click="signOut">Cerrar sesión</button>
          </div>
        </div>
        <button v-else class="signin-button" @click="showAuth = true">Ingresar</button>
      </div>
    </header>

    <main>
      <section v-if="activeView === 'catalog' && featuredMovie" class="feature" :style="{ '--feature-image': `url('${featuredMovie.bannerImg || featuredMovie.coverImg}')` }">
        <div class="feature-shade"></div>
        <div class="feature-content">
          <p class="eyebrow"><span class="live-dot"></span> SELECCIÓN MAQUI <span class="eyebrow-line"></span> {{ featuredMovie.releaseYear }}</p>
          <h1>{{ featuredMovie.title }}</h1>
          <p class="feature-category">{{ featuredMovie.category?.name || 'Cine seleccionado' }}</p>
          <p class="feature-description">{{ featuredMovie.description }}</p>
          <div class="feature-actions">
            <button class="primary-button" @click="selectedMovie = featuredMovie"><span aria-hidden="true">▶</span> Ver detalles</button>
            <button class="quiet-button" @click="toggleMyList(featuredMovie)"><span aria-hidden="true">{{ isSaved(featuredMovie) ? '✓' : '+' }}</span> {{ isSaved(featuredMovie) ? 'En mi lista' : 'Mi lista' }}</button>
          </div>
        </div>
        <div class="feature-index"><span>01</span><i></i><span>{{ String(movies.length).padStart(2, '0') }}</span></div>
        <span class="feature-caption">CATÁLOGO / {{ featuredMovie.category?.name || 'DESTACADOS' }}</span>
      </section>

      <section v-if="activeView === 'profile'" class="profile-page">
        <div class="profile-heading">
          <p class="eyebrow section-kicker">TU CUENTA MAQUI</p>
          <h1>Tu perfil</h1>
          <p>Tu espacio, tus historias guardadas.</p>
        </div>
        <div class="profile-details">
          <div class="profile-avatar">{{ currentUser?.name?.slice(0, 1) || 'M' }}</div>
          <div><span>MIEMBRO</span><h2>{{ currentUser?.name }} {{ currentUser?.lastName }}</h2><p>{{ currentUser?.email }}</p></div>
          <button class="quiet-button profile-signout" @click="signOut">Cerrar sesión</button>
        </div>
        <section class="saved-section">
          <div class="section-heading"><div><p class="eyebrow section-kicker">TU COLECCIÓN PERSONAL</p><h2>Mis guardados</h2></div><span class="result-count">{{ myList.length }} TÍTULOS</span></div>
          <p v-if="!myList.length" class="status-message">Todavía no guardaste títulos. Explorá el catálogo y tocá + para sumar una película.</p>
          <div v-else class="movie-grid">
            <article v-for="(movie, index) in myList" :key="movie._id" class="movie-tile" :style="{ '--tile-order': index }">
              <button class="poster-button" :aria-label="`Ver detalles de ${movie.title}`" @click="selectedMovie = movie">
                <img :src="movie.coverImg" :alt="`Póster de ${movie.title}`" loading="lazy" @error="$event.target.style.visibility = 'hidden'" />
                <span class="poster-fallback">{{ movie.title }}</span><span class="poster-play" aria-hidden="true">▶</span>
              </button>
              <div class="tile-meta"><div><h3>{{ movie.title }}</h3><p>{{ movie.releaseYear }} <span>·</span> {{ movie.category?.name || 'Película' }}</p></div><button class="tile-save" title="Quitar de mis guardados" aria-label="Quitar de mis guardados" @click="toggleMyList(movie)">✓</button></div>
            </article>
          </div>
        </section>
      </section>

      <section v-else class="catalog-section" :class="{ 'catalog-section-empty': !featuredMovie || activeView === 'mylist' }">
        <div class="section-heading">
          <div>
            <p class="eyebrow section-kicker">{{ activeView === 'mylist' ? 'TU ESPACIO' : 'CATÁLOGO' }}</p>
            <h2>{{ activeView === 'mylist' ? 'Mi lista' : search ? 'Resultados' : 'Para descubrir' }}</h2>
          </div>
          <span class="result-count">{{ visibleMovies.length }} TÍTULOS</span>
        </div>

        <div v-if="activeView === 'catalog'" class="category-tabs" aria-label="Filtrar por categoría">
          <button :class="{ selected: !selectedCategory }" @click="selectedCategory = ''; loadMovies()">Todo</button>
          <button v-for="category in categories" :key="category._id" :class="{ selected: selectedCategory === category.name }" @click="selectedCategory = category.name; loadMovies()">{{ category.name }}</button>
        </div>

        <p v-if="error" class="status-message error-message">{{ error }}</p>
        <p v-else-if="loading" class="status-message">Cargando catálogo<span class="loading-mark">...</span></p>
        <p v-else-if="!visibleMovies.length" class="status-message">{{ activeView === 'mylist' ? 'Todavía no guardaste títulos.' : 'No encontramos títulos con esos filtros.' }}</p>

        <div v-else-if="!showRecommendations" class="movie-grid">
          <article v-for="(movie, index) in visibleMovies" :key="movie._id" class="movie-tile" :style="{ '--tile-order': index }">
            <button class="poster-button" :aria-label="`Ver detalles de ${movie.title}`" @click="selectedMovie = movie">
              <img :src="movie.coverImg" :alt="`Póster de ${movie.title}`" loading="lazy" @error="$event.target.style.visibility = 'hidden'" />
              <span class="poster-fallback">{{ movie.title }}</span>
              <span class="poster-play" aria-hidden="true">▶</span>
            </button>
            <div class="tile-meta">
              <div><h3>{{ movie.title }}</h3><p>{{ movie.releaseYear }} <span>·</span> {{ movie.category?.name || 'Película' }}</p></div>
              <button class="tile-save" :aria-label="isSaved(movie) ? 'Quitar de mi lista' : 'Agregar a mi lista'" :title="isSaved(movie) ? 'Quitar de mi lista' : 'Agregar a mi lista'" @click="toggleMyList(movie)">{{ isSaved(movie) ? '✓' : '+' }}</button>
            </div>
          </article>
        </div>

        <div v-else class="recommendation-list">
          <section v-for="row in recommendationRows" :key="row.title" class="recommendation-row">
            <div class="row-heading">
              <div><p class="eyebrow section-kicker">{{ row.accent }}</p><h3>{{ row.title }}</h3></div>
              <span>{{ row.movies.length }} TÍTULOS</span>
            </div>
            <div class="row-track">
              <article v-for="(movie, index) in row.movies" :key="movie._id" class="movie-tile" :style="{ '--tile-order': index }">
                <button class="poster-button" :aria-label="`Ver detalles de ${movie.title}`" @click="selectedMovie = movie">
                  <img :src="movie.coverImg" :alt="`Póster de ${movie.title}`" loading="lazy" @error="$event.target.style.visibility = 'hidden'" />
                  <span class="poster-fallback">{{ movie.title }}</span>
                  <span class="poster-play" aria-hidden="true">▶</span>
                </button>
                <div class="tile-meta">
                  <div><h3>{{ movie.title }}</h3><p>{{ movie.releaseYear }} <span>·</span> {{ movie.category?.name || 'Película' }}</p></div>
                  <button class="tile-save" :aria-label="isSaved(movie) ? 'Quitar de mi lista' : 'Agregar a mi lista'" :title="isSaved(movie) ? 'Quitar de mi lista' : 'Agregar a mi lista'" @click="toggleMyList(movie)">{{ isSaved(movie) ? '✓' : '+' }}</button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>

    <footer class="footer"><span>MAQUI<span class="brand-dot">.</span></span><span>CINE PARA MIRAR DE CERCA</span><span>© 2026</span></footer>

    <div v-if="selectedMovie" class="overlay" @click.self="selectedMovie = null" @keydown.esc="selectedMovie = null">
      <section class="detail-dialog" role="dialog" aria-modal="true" :aria-label="selectedMovie.title">
        <button class="close-button" aria-label="Cerrar" @click="selectedMovie = null">×</button>
        <img class="detail-backdrop" :src="selectedMovie.bannerImg || selectedMovie.coverImg" :alt="''" />
        <div class="detail-content">
          <p class="eyebrow"><span class="live-dot"></span> MAQUI PRESENTA</p>
          <h2>{{ selectedMovie.title }}</h2>
          <div class="detail-meta"><span>{{ selectedMovie.releaseYear }}</span><i></i><span>{{ selectedMovie.category?.name || 'Película' }}</span><i></i><span>{{ selectedMovie.duration ? `${selectedMovie.duration} min` : 'Series' }}</span></div>
          <p class="detail-description">{{ selectedMovie.description }}</p>
          <div class="feature-actions">
            <a class="primary-button detail-trailer" :href="trailerSearchUrl(selectedMovie)" target="_blank" rel="noreferrer"><span aria-hidden="true">▶</span> Ver tráiler</a>
            <button class="quiet-button detail-save" @click="toggleMyList(selectedMovie)"><span>{{ isSaved(selectedMovie) ? '✓' : '+' }}</span> {{ isSaved(selectedMovie) ? 'En mi lista' : 'Mi lista' }}</button>
          </div>
          <p class="detail-note">Tráiler y material promocional pertenecen a sus respectivos titulares.</p>
        </div>
      </section>
    </div>

    <div v-if="showAuth" class="overlay auth-overlay" @click.self="showAuth = false">
      <section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button class="close-button" aria-label="Cerrar" @click="showAuth = false">×</button>
        <p class="eyebrow">TU CUENTA MAQUI</p>
        <h2 id="auth-title">{{ authMode === 'signin' ? 'Volvé al cine.' : 'Sumate a MAQUI.' }}</h2>
        <form @submit.prevent="submitAuth">
          <template v-if="authMode === 'signup'">
            <div class="auth-row"><input v-model="authForm.name" required placeholder="Nombre" autocomplete="given-name" /><input v-model="authForm.lastName" required placeholder="Apellido" autocomplete="family-name" /></div>
          </template>
          <input v-model="authForm.email" required type="email" placeholder="Email" autocomplete="email" />
          <input v-model="authForm.password" required type="password" minlength="6" placeholder="Contraseña" :autocomplete="authMode === 'signin' ? 'current-password' : 'new-password'" />
          <p v-if="authError" class="form-error">{{ authError }}</p>
          <button class="primary-button auth-submit" type="submit" :disabled="authBusy">{{ authBusy ? 'Un momento...' : authMode === 'signin' ? 'Ingresar' : 'Crear cuenta' }}</button>
        </form>
        <button class="auth-switch" @click="authMode = authMode === 'signin' ? 'signup' : 'signin'; authError = ''">{{ authMode === 'signin' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta. Ingresar' }}</button>
      </section>
    </div>
  </div>
</template>