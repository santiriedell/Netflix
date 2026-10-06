# PibeFlix API

API REST con Express y MongoDB/Mongoose. Incluye catálogo con URLs de imágenes,
registro, inicio de sesión JWT y una lista personal de películas por usuario.

## Configurar MongoDB Atlas

1. Crea un proyecto y un cluster en [MongoDB Atlas](https://www.mongodb.com/atlas).
2. En **Database Access**, crea un usuario de base de datos y guarda su contraseña.
3. En **Network Access**, autoriza la IP desde la que vas a ejecutar la API. Para
   desarrollo se puede autorizar tu IP actual; evita `0.0.0.0/0` salvo que sea
   estrictamente necesario.
4. En el cluster, pulsa **Connect → Drivers**, copia la URI de conexión y reemplaza
   `<password>` por la contraseña del usuario de base de datos. Si la contraseña
   contiene caracteres especiales, codifícala para URL.
5. Copia `.env.example` como `.env` dentro de `backend` y completa `URI_LINK` y
   `JWT_SECRET`. No compartas ni subas `.env`; ya está excluido por `.gitignore`.
6. Para cargar pósters y fondos de películas/series desde TMDb, solicita una API
   Read Access Token en **TMDb → Settings → API** y agrégalo a `.env` como
   `TMDB_READ_ACCESS_TOKEN`. No lo pongas en el frontend ni lo compartas.

Ejemplo de configuración (usa tus propios valores):

```env
PORT=4000
URI_LINK=mongodb+srv://USUARIO:CLAVE@cluster0.ejemplo.mongodb.net/bichiflix?retryWrites=true&w=majority
JWT_SECRET=reemplazar-por-un-secreto-largo-y-aleatorio
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Atlas crea la base `bichiflix` y sus colecciones al guardar los primeros
documentos. Las contraseñas de usuarios se guardan con hash bcrypt; el token JWT
se devuelve al iniciar sesión o registrarse y se usa para proteger la lista.

## Instalar y ejecutar

Desde la carpeta `backend`:

```bash
npm install
npm run seed
npm run dev
```

El seed agrega las categorías y películas de ejemplo sin borrar usuarios, listas
ni otros documentos. Solo crea el usuario de demostración si todavía no existe:
`demo@bichiflix.com` / `miau123`. Cambia o elimina esa cuenta antes de publicar la
aplicación.

Si `TMDB_READ_ACCESS_TOKEN` está configurado, el seed busca cada título en TMDb
y actualiza las imágenes cuando encuentra una coincidencia exacta. Si no hay
token, conserva las URLs actuales; si una búsqueda falla, informa el problema y
conserva las imágenes anteriores de ese título. PibeFlix incluye la atribución
requerida: “This product uses the TMDB API but is not endorsed or certified by
TMDB.” El uso de imágenes y API está sujeto a los términos y condiciones de
TMDb.

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
