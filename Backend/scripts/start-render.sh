#!/usr/bin/env sh
# Force redeploy: v4 – auto-generate room_name for old consultations
set -eu

cd /var/www/html

php artisan storage:link || true

if [ -z "${APP_KEY:-}" ]; then
  echo "❌ ERREUR FATALE: APP_KEY est absente. Definissez-la dans les variables d'environnement Render." >&2
  echo "Generez-en une avec: php artisan key:generate --show" >&2
  exit 1
fi

if [ -z "${REVERB_APP_KEY:-}" ]; then
  echo "⚠ REVERB_APP_KEY manquant — generation automatique." >&2
  export REVERB_APP_KEY="$(head -c 20 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)"
  echo "REVERB_APP_KEY=$REVERB_APP_KEY" >> /var/www/html/.env
fi

if [ -z "${REVERB_APP_SECRET:-}" ]; then
  echo "⚠ REVERB_APP_SECRET manquant — generation automatique." >&2
  export REVERB_APP_SECRET="$(head -c 20 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)"
  echo "REVERB_APP_SECRET=$REVERB_APP_SECRET" >> /var/www/html/.env
fi

php artisan optimize:clear || true

case "${APP_RUNTIME_MODE:-web}" in
  web)
    php artisan migrate --force
    if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
      php artisan db:seed --class="${SEED_DATABASE_CLASS:-Database\\Seeders\\DatabaseSeeder}" --force || true
    else
      php artisan db:seed --class="${SEED_DATABASE_CLASS:-Database\\Seeders\\ProductionSeeder}" --force || true
    fi
    # Si PASSPORT_PRIVATE_KEY est defini en env var, pas besoin de generer les fichiers
    if [ -z "${PASSPORT_PRIVATE_KEY:-}" ]; then
      php artisan passport:keys --force || true
    fi
    php artisan passport:client --personal --name="Render Personal Access Client" --no-interaction || true

    # ── Remplacer le port dans la config nginx si PORT != 10000 ──
    PORT="${PORT:-10000}"
    sed -i "s/listen 10000/listen ${PORT}/" /etc/nginx/sites-available/default

    # ── Démarrer PHP-FPM en arrière-plan puis Nginx au premier plan ──
    php-fpm -D
    exec nginx -g "daemon off;"
    ;;
  worker)
    exec php artisan queue:work --sleep=3 --tries=3 --timeout=120
    ;;
  reverb)
    exec php artisan reverb:start --host=0.0.0.0 --port="${PORT:-10000}"
    ;;
  *)
    echo "APP_RUNTIME_MODE inconnu: ${APP_RUNTIME_MODE:-web}" >&2
    exit 1
    ;;
esac