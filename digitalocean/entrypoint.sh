#!/usr/bin/env sh
set -eu

cd /var/www/html/backend

derive_host() {
  php -r '
$value = getenv("'"$1"'") ?: "";
$host = parse_url($value, PHP_URL_HOST);
if (!$host) {
    $trimmed = trim($value);
    if ($trimmed !== "" && !str_contains($trimmed, "://")) {
        $host = preg_replace("#[:/].*$#", "", $trimmed);
    }
}
echo $host ?: "";
'
}

APP_HOST="$(derive_host APP_URL)"
FRONTEND_HOST="$(derive_host FRONTEND_URL)"

if [ -z "${SESSION_DOMAIN:-}" ] && [ -n "$APP_HOST" ]; then
  export SESSION_DOMAIN="$APP_HOST"
fi

if [ -z "${SANCTUM_STATEFUL_DOMAINS:-}" ]; then
  DOMAINS="localhost,localhost:3000,localhost:5173,127.0.0.1,127.0.0.1:3000,127.0.0.1:5173"
  if [ -n "$APP_HOST" ]; then
    DOMAINS="$DOMAINS,$APP_HOST,$APP_HOST:80,$APP_HOST:443"
  fi
  if [ -n "$FRONTEND_HOST" ] && [ "$FRONTEND_HOST" != "$APP_HOST" ]; then
    DOMAINS="$DOMAINS,$FRONTEND_HOST,$FRONTEND_HOST:80,$FRONTEND_HOST:443"
  fi
  export SANCTUM_STATEFUL_DOMAINS="$DOMAINS"
fi

if [ -z "${CORS_ALLOWED_ORIGINS:-}" ]; then
  ORIGINS="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
  if [ -n "${APP_URL:-}" ]; then
    ORIGINS="$ORIGINS,${APP_URL}"
  fi
  if [ -n "${FRONTEND_URL:-}" ] && [ "${FRONTEND_URL}" != "${APP_URL:-}" ]; then
    ORIGINS="$ORIGINS,${FRONTEND_URL}"
  fi
  export CORS_ALLOWED_ORIGINS="$ORIGINS"
fi

if [ -z "${SESSION_SECURE_COOKIE:-}" ] && [ -n "${APP_URL:-}" ]; then
  case "${APP_URL}" in
    https://*) export SESSION_SECURE_COOKIE=true ;;
    *) export SESSION_SECURE_COOKIE=false ;;
  esac
fi

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

# ── Attendre la base de données (DNS + TCP) ──
DB_READY=0
for i in $(seq 1 30); do
  if php -r '
$host = getenv("DB_HOST") ?: "postgres";
$port = (int) (getenv("DB_PORT") ?: 5432);
$sock = @fsockopen($host, $port, $errno, $errstr, 2);
if ($sock) { fclose($sock); exit(0); }
exit(1);
'; then
    DB_READY=1
    break
  fi
  echo "⏳ Attente PostgreSQL ($i/30)..."
  sleep 2
done

if [ "$DB_READY" -ne 1 ]; then
  echo "❌ PostgreSQL indisponible après attente." >&2
  exit 1
fi

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

echo "✅ BFA TLM prêt — lancement des services..."

# ── Exec CMD (supervisord) ──
exec "$@"
