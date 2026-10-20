# MAQUI API

API REST con Express y MongoDB/Mongoose. Incluye catálogo con URLs de imágenes,
registro, inicio de sesión JWT y una lista personal de películas por usuario.

## Configurar MongoDB con Compass

1. Instala **MongoDB Community Server** y **MongoDB Compass**. Compass es el cliente
   gráfico; para una base local, el servidor de MongoDB también debe estar instalado
   y ejecutándose.
2. Abre Compass y conecta con `mongodb://127.0.0.1:27017`.
3. Pulsa **Create Database**. Usa `maquina` como nombre de base y `categories`
   como nombre de la primera colección.
4. En la raíz del proyecto, copia `.env.example` a `.env`. La URI local incluida
   apunta a `maquina`; completa también `JWT_SECRET` con una cadena larga y
   aleatoria. No compartas ni subas `.env`; está excluido por `.gitignore`.
5. Desde una terminal en la raíz, ejecuta `npm install` y luego `npm run seed`.
   El seed crea las colecciones necesarias y carga datos de ejemplo; puedes verlos
   en Compass actualizando la vista de la base.
6. Para cargar información desde OMDb, solicita una API key en
   [omdbapi.com](https://www.omdbapi.com/apikey.aspx) y agrégala a `.env` como
   `OMDB_API_KEY`. La key solo se usa en el backend/seed; no la pongas en el
   frontend ni la compartas. También puedes configurar `TMDB_READ_ACCESS_TOKEN`
   como alternativa si OMDb no encuentra un título.

Para usar **MongoDB Atlas** en lugar de una instalación local, crea un cluster,
un usuario de base de datos y autoriza tu IP en **Network Access**. En Compass
selecciona **Add new connection**, pega la URI de Atlas y conecta. Copia esa misma
URI en `URI_LINK` del `.env`, sustituyendo `<password>` por la contraseña del
usuario de base de datos y codificando los caracteres especiales de la contraseña.

Configuración local de ejemplo:

```env
PORT=4000
URI_LINK=mongodb://127.0.0.1:27017/maquina
JWT_SECRET=reemplazar-por-un-secreto-largo-y-aleatorio
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
OMDB_API_KEY=
# TMDB_READ_ACCESS_TOKEN=
```

MongoDB crea las colecciones al guardar los primeros documentos. Las contraseñas
de usuarios se guardan con hash bcrypt; el token JWT
se devuelve al iniciar sesión o registrarse y se usa para proteger la lista.

## Instalar y ejecutar

Desde la raíz del proyecto:

```bash
npm install
npm run seed
npm run api:dev
```

En otra terminal puedes iniciar el frontend con `npm run dev`. La API está
disponible en `http://localhost:4000`.

El seed agrega las categorías y películas de ejemplo sin borrar usuarios, listas
ni otros documentos. Solo crea el usuario de demostración si todavía no existe:
`demo@maqui.local` / `miau123`. Cambia o elimina esa cuenta antes de publicar la
aplicación.

Al ejecutar `npm run seed`, OMDb se consulta primero si `OMDB_API_KEY` está
configurada. Actualiza el póster, sinopsis, año y una categoría compatible; OMDb
no proporciona fondos, por lo que se conserva el banner existente. Si OMDb no
encuentra el título, el seed puede probar TMDb cuando `TMDB_READ_ACCESS_TOKEN`
está configurado. Si ninguna fuente encuentra una coincidencia, conserva los
datos existentes. Respeta los límites, términos y permisos de uso de cada API.
Para TMDb se incluye la atribución requerida: “This product uses the TMDB API but
is not endorsed or certified by TMDB.”

La API queda disponible en `http://localhost:4000`; el frontend Vue usa esa
dirección por defecto. Si cambias el puerto o publicas la API, configura
`VITE_API_URL` en el frontend con la URL base terminada en `/api`.

## Rutas principales

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/movies` | Catálogo; admite `title`, `category`, `page` y `limit` |
| `GET` | `/api/movies/:id` | Detalle de película |
| `POST` | `/api/movies` | Guardar película y URLs de sus imágenes |
| `PUT` | `/api/movies/:id` | Actualizar película |
| `GET` | `/api/categories` | Categorías |
| `POST` | `/api/auth/signup` | Registro (`name`, `lastName`, `email`, `password`) |
| `POST` | `/api/auth/signin` | Inicio de sesión (`email`, `password`) |
| `GET` | `/api/users/mylist` | Consultar la lista del usuario autenticado |
| `POST` | `/api/users/mylist` | Agregar `{ "movieId": "<id>" }` a la lista |
| `DELETE` | `/api/users/mylist/:movieId` | Quitar una película de la lista |

Las tres rutas de `/api/users/mylist` requieren el encabezado
`Authorization: Bearer <token>`.

Para crear una película, envía `title`, `description`, `coverImg`, `bannerImg`,
`videoUrl`, `releaseYear` y el `_id` de una categoría existente en `category`.
Las URLs de imagen son las que la app mostrará como póster y banner.

## Imágenes del catálogo

Cada documento de película almacena `coverImg` y `bannerImg` como URLs; el
frontend las muestra directamente y MongoDB guarda esas referencias, no los
archivos de imagen. Las imágenes del seed son marcadores de prueba de Picsum.
Para usar pósters reales, guarda en esos campos URLs de imágenes cuyo uso tengas
autorizado (por ejemplo, las URLs de imagen proporcionadas por un proveedor
como TMDb) al crear o actualizar películas mediante la API.
