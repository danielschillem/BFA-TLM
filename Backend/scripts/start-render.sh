#!/usr/bin/env sh
# Force redeploy: v4 – auto-generate room_name for old consultations
set -eu

cd /var/www/html

php artisan storage:link || true

if [ -z "${APP_KEY:-}" ]; then
  echo "⚠ APP_KEY manquant — generation automatique d'une cle temporaire." >&2
  echo "⚠ IMPORTANT: Definissez APP_KEY dans les variables d'environnement Render pour la persistance." >&2
  export APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
  echo "APP_KEY=$APP_KEY" >> /var/www/html/.env
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
    exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
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