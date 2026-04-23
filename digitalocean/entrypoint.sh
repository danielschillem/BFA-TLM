#!/usr/bin/env sh
set -eu

cd /var/www/html/backend

# ── Storage link ──
php artisan storage:link 2>/dev/null || true

# ── Vérifier APP_KEY ──
if [ -z "${APP_KEY:-}" ]; then
  echo "❌ ERREUR FATALE: APP_KEY est absente." >&2
  echo "Générez-en une avec: php artisan key:generate --show" >&2
  exit 1
fi

# ── Auto-générer les clés Reverb si absentes ──
if [ -z "${REVERB_APP_KEY:-}" ]; then
  export REVERB_APP_KEY="$(head -c 20 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)"
fi

if [ -z "${REVERB_APP_SECRET:-}" ]; then
  export REVERB_APP_SECRET="$(head -c 20 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)"
fi

# ── Clear cache ──
php artisan optimize:clear || true

# ── Migrations ──
php artisan migrate --force

# ── Seed conditionnel ──
if [ "${RUN_SEED:-false}" = "true" ]; then
  if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    php artisan db:seed --class="${SEED_DATABASE_CLASS:-Database\\Seeders\\DatabaseSeeder}" --force || true
  else
    php artisan db:seed --class="${SEED_DATABASE_CLASS:-Database\\Seeders\\ProductionSeeder}" --force || true
  fi
fi

# ── Cache config/routes/views pour la prod ──
php artisan config:cache
php artisan route:cache
php artisan view:cache

# ── Permissions ──
chown -R www-data:www-data storage bootstrap/cache

echo "✅ LiptakoCare prêt — lancement des services..."

# ── Exec CMD (supervisord) ──
exec "$@"
