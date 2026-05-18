# Sérenité Mobilité

Application web de cartographie de la densité de transport en commun et de planification de trajets calmes, développée dans le cadre d'un projet de fin d'études.

---

## Table des matières

- [Présentation](#présentation)
- [Architecture générale](#architecture-générale)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation et démarrage](#installation-et-démarrage)
  - [1. Backend Laravel](#1-backend-laravel)
  - [2. Modèle ML Python](#2-modèle-ml-python)
  - [3. Frontend React](#3-frontend-react)
- [Structure du projet](#structure-du-projet)
- [API — Endpoints](#api--endpoints)
- [Variables d'environnement](#variables-denvironnement)
- [Branches du dépôt](#branches-du-dépôt)

---

## Présentation

**Sérenité Mobilité** permet aux usagers des transports en commun de :

- Visualiser en temps réel la **densité de fréquentation** des zones de transport sur une carte interactive.
- **Planifier des trajets** en évitant les zones surchargées (trajets "calmes").
- Consulter des **prédictions de densité** par heure et par type de jour grâce à un modèle de machine learning.
- Gérer un compte utilisateur, sauvegarder et renommer des trajets favoris.

---

## Architecture générale

```
┌─────────────────────────────────────────────────────┐
│                    Navigateur Web                   │
│              React + Vite + Tailwind CSS            │
│           (Leaflet pour la carte interactive)       │
└─────────────────────┬───────────────────────────────┘
                      │  HTTP / JSON  (port 5173)
                      ▼
┌─────────────────────────────────────────────────────┐
│                 API Laravel (PHP)                   │
│           Sanctum (authentification JWT)            │
│           MySQL · Eloquent ORM                      │
└──────────┬──────────────────────┬───────────────────┘
           │  subprocess Python   │  base de données
           ▼                      ▼
┌─────────────────────┐   ┌───────────────────────────┐
│   Modèle ML Python  │   │        MySQL / SQLite      │
│  scikit-learn +     │   │  zones, trajets, users,    │
│  joblib (.pkl)      │   │  densités                  │
└─────────────────────┘   └───────────────────────────┘
```

---

## Stack technique

| Couche     | Technologie                                      |
|------------|--------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, React-Leaflet      |
| Backend    | Laravel 11, PHP 8.2, Laravel Sanctum             |
| Base de données | MySQL (ou SQLite en dev)                   |
| ML         | Python 3.10+, scikit-learn, pandas, joblib       |
| Auth       | Laravel Sanctum (tokens Bearer)                  |

---

## Prérequis

- **PHP** ≥ 8.2 + Composer
- **Node.js** ≥ 18 + npm
- **Python** ≥ 3.10
- **MySQL** (ou SQLite pour les tests locaux)
- Git

---

## Installation et démarrage

Cloner le dépôt et choisir la bonne branche (voir [Branches](#branches-du-dépôt)).

```bash
git clone https://github.com/touremamahakim76-commits/PROJET-FIN-D-ETUDE.git
```

### 1. Backend Laravel

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configurer `.env` (connexion MySQL, chemins ML) :

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=serenite_mobilite
DB_USERNAME=root
DB_PASSWORD=

ML_PYTHON_BIN=python
ML_MODEL_DIR=../ml
```

Créer la base et charger les données :

```bash
php artisan migrate --seed
```

> Le seeder importe automatiquement les zones depuis `../ml/zones_metro.json`.

Démarrer le serveur :

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

L'API est accessible sur `http://127.0.0.1:8000/api`.

---

### 2. Modèle ML Python

```bash
cd ml
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
```

Fichiers inclus dans `ml/` :

| Fichier                      | Rôle                                              |
|------------------------------|---------------------------------------------------|
| `model_metro.pkl`            | Modèle scikit-learn entraîné (prédiction densité) |
| `le_emplacement.pkl`         | Encodeur LabelEncoder — emplacement               |
| `le_exploitant.pkl`          | Encodeur LabelEncoder — exploitant                |
| `le_jour.pkl`                | Encodeur LabelEncoder — type de jour              |
| `le_ligne.pkl`               | Encodeur LabelEncoder — ligne                     |
| `le_mode.pkl`                | Encodeur LabelEncoder — mode de transport         |
| `zones_metro.json`           | Données géographiques des zones (utilisées par le seeder) |
| `validations_metro_final.csv`| Données source d'entraînement                     |
| `ml1.ipynb`                  | Notebook d'exploration et d'entraînement          |

> Si Python n'est pas disponible, le backend renvoie une estimation de secours pour que l'application reste utilisable.

---

### 3. Frontend React

```bash
cd frontend
npm install
```

Créer le fichier `.env.local` :

```env
VITE_USE_MOCK=false
VITE_API_URL=http://127.0.0.1:8000/api
```

> Mettre `VITE_USE_MOCK=true` pour travailler sans backend (données fictives intégrées).

Démarrer le serveur de développement :

```bash
npm run dev
```

Ouvrir `http://127.0.0.1:5173` dans le navigateur.

---

## Structure du projet

```
sérenité mobilité/
├── frontend/                   # Application React
│   ├── src/
│   │   ├── api/                # Clients HTTP (auth, zones, routes)
│   │   ├── components/
│   │   │   ├── layout/         # Navbar, Footer, BrandLogo
│   │   │   ├── map/            # MapView, ZoneDetailPanel, sliders
│   │   │   └── ui/             # Button, Card, Input, Badge, Loader
│   │   ├── context/            # AuthContext (état global utilisateur)
│   │   ├── mocks/              # Données fictives (dev sans backend)
│   │   ├── pages/              # Home, Login, Register, MapPage,
│   │   │                       # RoutePlanner, Profile, SavedRoutes,
│   │   │                       # DataSovereignty, NotFound
│   │   └── routes/             # ProtectedRoute
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                    # API Laravel
│   ├── app/
│   │   ├── Http/Controllers/   # Auth, Zone, Densite, Trajet,
│   │   │                       # ApiExterne
│   │   ├── Models/             # User, Zone, Densite, Trajet
│   │   └── Services/           # MlPredictionService,
│   │                           # OfficialRoutePlannerService
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
│
└── ml/                         # Modèle de prédiction Python
    ├── model_metro.pkl
    ├── le_*.pkl                 # Encodeurs
    ├── zones_metro.json
    ├── validations_metro_final.csv
    ├── requirements.txt
    └── ml1.ipynb
```

---

## API — Endpoints

### Authentification (public)

| Méthode | Endpoint             | Description            |
|---------|----------------------|------------------------|
| POST    | `/api/auth/register` | Créer un compte        |
| POST    | `/api/auth/login`    | Connexion (token)      |

### Authentification (protégé — Bearer token)

| Méthode | Endpoint         | Description             |
|---------|------------------|-------------------------|
| GET     | `/api/auth/me`   | Profil utilisateur      |
| POST    | `/api/auth/logout` | Déconnexion           |

### Zones (public)

| Méthode | Endpoint                       | Description                        |
|---------|--------------------------------|------------------------------------|
| GET     | `/api/zones?hour=18`           | Liste des zones avec densité        |
| GET     | `/api/zones/:id/predict?hour=18` | Prédiction ML pour une zone      |
| GET     | `/api/densites`                | Données de densité brutes           |

### Trajets

| Méthode | Endpoint                  | Description                  |
|---------|---------------------------|------------------------------|
| POST    | `/api/routes/calculate`   | Calculer un trajet (public)  |
| GET     | `/api/routes/saved`       | Trajets sauvegardés (auth)   |
| POST    | `/api/routes/saved`       | Sauvegarder un trajet (auth) |
| PATCH   | `/api/routes/saved/:id`   | Renommer un trajet (auth)    |
| DELETE  | `/api/routes/saved/:id`   | Supprimer un trajet (auth)   |

---

## Variables d'environnement

### Backend (`backend/.env`)

```env
APP_NAME="Serenite Mobilite"
APP_ENV=local
APP_KEY=           # généré par php artisan key:generate
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=serenite_mobilite
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173

ML_PYTHON_BIN=python
ML_MODEL_DIR=../ml
```

### Frontend (`frontend/.env.local`)

```env
VITE_USE_MOCK=false
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## Branches du dépôt

| Branche        | Contenu                                         |
|----------------|-------------------------------------------------|
| `main`         | README global du projet                         |
| `frontend`     | Code source React / Vite (cette branche)        |
| `backend`      | API Laravel + migrations + seeders              |
| `ezechiel-ml`  | Notebook et modèles Python (ML)                 |

---

*Projet de fin d'études — 2025/2026*
