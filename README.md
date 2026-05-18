# Serenite Mobilite Frontend

Application React/Vite de cartographie des zones de transport et de calcul de trajets calmes.

Ce frontend est maintenant branche sur le backend Laravel du dossier `../backend`.

## Demarrage

```bash
npm install
npm run dev
```

L'application utilise `.env.local` :

```env
VITE_USE_MOCK=false
VITE_API_URL=http://127.0.0.1:8000/api
```

## Endpoints utilises

```txt
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/zones?hour=18
GET    /api/zones/:id/predict?hour=18

POST   /api/routes/calculate
GET    /api/routes/saved
POST   /api/routes/saved
DELETE /api/routes/saved/:id
PATCH  /api/routes/saved/:id
```

Pour revenir temporairement aux donnees mock, mettre `VITE_USE_MOCK=true`.
