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
    if [ "${RUN_SEED:-false}" = "true" ]; then
      if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
        php artisan db:seed --class="${SEED_DATABASE_CLASS:-Database\\Seeders\\DatabaseSeeder}" --force || true
      else
        php artisan db:seed --class="${SEED_DATABASE_CLASS:-Database\\Seeders\\ProductionSeeder}" --force || true
      fi
    fi
    # Si PASSPORT_PRIVATE_KEY est defini en env var, pas besoin de generer les fichiers
    if [ -z "${PASSPORT_PRIVATE_KEY:-}" ]; then
      php artisan passport:keys --force || true
    fi
    # Créer le client Passport seulement s'il n'existe pas encore
    php artisan tinker --execute="if(!\Laravel\Passport\Client::where('personal_access_client',true)->exists()){exit(1);}" 2>/dev/null \
      || php artisan passport:client --personal --name="Render Personal Access Client" --no-interaction || true

    # ── Remplacer le port dans la config nginx si PORT != 10000 ──
    PORT="${PORT:-10000}"
    sed -i "s/listen 10000/listen ${PORT}/" /etc/nginx/sites-available/default

    # ── Fixer les permissions avant de dropper les privilèges ──
    chown -R www-data:www-data storage bootstrap/cache

    # ── Démarrer PHP-FPM en arrière-plan (en tant que www-data via config) ──
    php-fpm -D

    # ── Dropper les privilèges root et lancer Nginx au premier plan ──
    exec nginx -g "daemon off;"
    ;;
  worker)
    exec gosu www-data php artisan queue:work --sleep=3 --tries=3 --timeout=120
    ;;
  reverb)
    exec gosu www-data php artisan reverb:start --host=0.0.0.0 --port="${PORT:-10000}"
    ;;
  *)
    echo "APP_RUNTIME_MODE inconnu: ${APP_RUNTIME_MODE:-web}" >&2
    exit 1
    ;;
esac