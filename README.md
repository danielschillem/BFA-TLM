# BFA TLM (TLM APP-BFA)

Plateforme de télésanté pour le Burkina Faso.

**Production :** [https://bfa-tlm.online/](https://bfa-tlm.online/)

## Stack

- **Backend :** Laravel 11, PHP 8.3 / 8.4, Sanctum, Spatie Permission, Reverb
- **Frontend :** React 18, Vite, TanStack Query
- **Visioconférence :** LiveKit (WebRTC)

## Structure du dépôt

| Dossier | Rôle |
|--------|------|
| `Backend/` | API Laravel (`composer.json`, `artisan`) |
| `Frontend/` | SPA React (`package.json`, Vite) |
| `digitalocean/` | Image Docker unifiée, Compose prod, `deploy.sh` |
| `docker/` | Fichiers d’environnement pour Docker Desktop (voir racine) |
| `docker-compose.yml` | Stack locale **Docker Desktop** (Postgres + Redis + app) |

## Démarrage local

### Sans Docker

**Backend**

```bash
cd Backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

**Frontend**

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```

### Avec Docker Desktop

```bash
cp docker/.env.example docker/.env
# Renseigner APP_KEY et DB_PASSWORD dans docker/.env
docker compose --env-file docker/.env up -d --build
```

Application : **http://localhost:8080** (voir commentaires dans `docker-compose.yml`).

Déploiement serveur : `digitalocean/README.md`.

## Qualité et conventions

| Commande | Description |
|----------|-------------|
| `cd Backend && composer run format` | Laravel Pint (format PHP) |
| `cd Backend && composer run lint` | Pint en vérification seule (`--test`) |
| `cd Backend && composer run test` | Suite PHPUnit / `artisan test` |
| `cd Frontend && npm run lint` | ESLint |
| `cd Frontend && npm run test` | Vitest |

- Fin de ligne **LF**, encodage **UTF-8** (voir `.editorconfig`, `.gitattributes`).
- PHP : style **Laravel Pint** (`Backend/pint.json`, preset `laravel`).
- JS/JSX : **2 espaces** ; YAML : **2 espaces** ; PHP : **4 espaces**.

Documentation détaillée : `DOCUMENTATION.md`, `Backend/README.md`.
