# TLM APP-BFA (BFA TLM)

Plateforme de telesante pour le Burkina Faso.

## Stack

- Backend: Laravel 11 (PHP 8.3), Sanctum, Spatie Permission, Reverb
- Frontend: React 18, Vite, React Query
- Visioconference: LiveKit (WebRTC)

## Dossiers principaux

- `Backend/` API Laravel
- `Frontend/` SPA React
- `DOCUMENTATION.md` documentation projet

## Demarrage local

Backend:

```bash
cd Backend
composer install
php artisan migrate
php artisan serve
```

Frontend:

```bash
cd Frontend
npm install
npm run dev
```

## Qualite

- Backend tests: `cd Backend && php artisan test`
- Frontend tests: `cd Frontend && npm run test`
- Frontend lint: `cd Frontend && npm run lint`

