#!/usr/bin/env sh
set -eu

cd /var/www/html

php artisan storage:link || true
php artisan optimize:clear || true

case "${APP_RUNTIME_MODE:-web}" in
  web)
    php artisan migrate --force
    php artisan db:seed --class=RolePermissionSeeder --force || true
    php artisan passport:keys --force || true
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