#!/usr/bin/env bash
############################################################
# BFA TLM — Script de déploiement DigitalOcean Droplet
# Usage : bash digitalocean/deploy.sh [--full-rebuild] [domaine]
#
# Prérequis sur le Droplet :
#   - Ubuntu 22.04+ / Debian 12+
#   - SSH access root ou sudo
#
# Ce script installe Docker, clone le repo, et lance l'app.
############################################################
set -euo pipefail

DOMAIN=""
FULL_REBUILD="false"

for arg in "$@"; do
  case "$arg" in
    --full-rebuild)
      FULL_REBUILD="true"
      ;;
    *)
      if [ -z "$DOMAIN" ]; then
        DOMAIN="$arg"
      else
        echo "Usage: bash digitalocean/deploy.sh [--full-rebuild] [domaine]"
        exit 1
      fi
      ;;
  esac
done
REPO_URL="https://github.com/danielschillem/BFA-TLM.git"
APP_DIR="/opt/bfa-tlm"
BASE_ENV_FILE="$APP_DIR/digitalocean/.env"
RUNTIME_ENV_FILE="/tmp/bfa-tlm.deploy.env"

docker_compose() {
  docker compose -f "$APP_DIR/digitalocean/docker-compose.yml" --env-file "$RUNTIME_ENV_FILE" "$@"
}

render_runtime_env() {
  cp "$BASE_ENV_FILE" "$RUNTIME_ENV_FILE"
  if [ -n "$DOMAIN" ]; then
    {
      echo "APP_BIND=127.0.0.1"
      echo "APP_PORT=8080"
      echo "APP_URL=https://$DOMAIN"
      echo "FRONTEND_URL=https://$DOMAIN"
      echo "REVERB_HOST=$DOMAIN"
      echo "REVERB_PORT=443"
      echo "REVERB_SCHEME=https"
    } >> "$RUNTIME_ENV_FILE"
  fi
}

sanitize_env_file() {
  # Avoid inline comments being interpreted as secrets/URLs.
  sed -i 's|^APP_KEY=.*|APP_KEY='"${APP_KEY_VALUE}"'|' "$BASE_ENV_FILE"
  sed -i 's|^APP_URL=.*|APP_URL=https://'"${DOMAIN:-$(grep '^APP_URL=' "$BASE_ENV_FILE" | cut -d= -f2 | sed 's#^https\?://##; s#/.*$##; s/[[:space:]#].*$//')}"'|' "$BASE_ENV_FILE"
  sed -i 's|^REDIS_PASSWORD=.*|REDIS_PASSWORD=|' "$BASE_ENV_FILE"
  sed -i 's|^REVERB_APP_KEY=.*|REVERB_APP_KEY=|' "$BASE_ENV_FILE"
  sed -i 's|^REVERB_APP_SECRET=.*|REVERB_APP_SECRET=|' "$BASE_ENV_FILE"
}

echo "═══════════════════════════════════════════════════════"
echo "  BFA TLM v3.0.0 — Déploiement DigitalOcean"
echo "═══════════════════════════════════════════════════════"

# ── 1. Installation Docker ──
if ! command -v docker &>/dev/null; then
  echo "📦 Installation de Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  echo "✅ Docker installé"
else
  echo "✅ Docker déjà installé"
fi

# ── 2. Clone / Pull du repo ──
if [ -d "$APP_DIR/.git" ]; then
  echo "📥 Mise à jour du code..."
  cd "$APP_DIR"
  if ! git pull origin main; then
    echo "⚠️  git pull impossible (repo privé / credentials)."
    echo "    Poursuite avec le code déjà présent sur le serveur."
  fi
else
  echo "📥 Clonage du repo..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 3. Vérifier le fichier .env ──
if [ ! -f "$BASE_ENV_FILE" ]; then
  echo ""
  echo "⚠️  Fichier .env manquant !"
  echo "   Copiez et éditez le fichier d'exemple :"
  echo ""
  echo "   cp $APP_DIR/digitalocean/.env.example $APP_DIR/digitalocean/.env"
  echo "   nano $APP_DIR/digitalocean/.env"
  echo ""
  echo "   Puis relancez : bash $APP_DIR/digitalocean/deploy.sh $DOMAIN"
  exit 1
fi

APP_KEY_VALUE="$(grep '^APP_KEY=' "$BASE_ENV_FILE" | cut -d= -f2- | sed 's/[[:space:]]*$//' || true)"
if [ -z "${APP_KEY_VALUE}" ] || [[ "$APP_KEY_VALUE" == *"#"* ]]; then
  APP_KEY_VALUE="base64:$(openssl rand -base64 32)"
fi
sanitize_env_file

# ── 4. Générer env runtime + désactiver anciens services host ──
render_runtime_env
systemctl stop bfa-tlm-reverb.service 2>/dev/null || true
systemctl disable bfa-tlm-reverb.service 2>/dev/null || true
systemctl stop bfa-tlm-worker.service 2>/dev/null || true
systemctl disable bfa-tlm-worker.service 2>/dev/null || true

# ── 5. Build & Lancement ──
echo "🔨 Build de l'image Docker (frontend + backend)..."
if [ "$FULL_REBUILD" = "true" ]; then
  echo "   Mode: full rebuild (sans cache)"
  docker_compose build --pull --no-cache
else
  echo "   Mode: build rapide (cache Docker activé)"
  docker_compose build
fi

echo "🚀 Lancement des services..."
docker_compose up -d --remove-orphans

# ── 6. SSL avec Certbot (si domaine fourni) ──
if [ -n "$DOMAIN" ]; then
  echo "🔒 Configuration SSL pour $DOMAIN..."

  if ! command -v certbot &>/dev/null; then
    apt-get install -y -qq certbot python3-certbot-nginx
  fi

  # Installer Nginx sur l'hôte comme reverse proxy SSL → Docker :80
  apt-get install -y -qq nginx

  cat > /etc/nginx/sites-available/bfa-tlm <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        client_max_body_size 50M;
    }
}
NGINX

  ln -sf /etc/nginx/sites-available/bfa-tlm /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default

  nginx -t && systemctl reload nginx

  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" --redirect || {
    echo "⚠️  Certbot a échoué — vérifiez que le DNS pointe vers ce serveur"
    echo "   Relancez manuellement : certbot --nginx -d $DOMAIN"
  }
fi

# ── 7. Vérification ──
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Déploiement terminé !"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Services :"
docker_compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

if [ -n "$DOMAIN" ]; then
  echo "  🌐 URL : https://$DOMAIN"
  echo "  🏥 API : https://$DOMAIN/api/v1"
  echo "  ❤️  Health: https://$DOMAIN/up"
else
  IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
  echo "  🌐 URL : http://$IP"
  echo "  🏥 API : http://$IP/api/v1"
  echo "  ❤️  Health: http://$IP/up"
  echo ""
  echo "  Pour activer SSL :"
  echo "  bash $APP_DIR/digitalocean/deploy.sh bfa-tlm.online"
fi
echo ""
echo "  Commandes utiles :"
echo "  docker compose -f $APP_DIR/digitalocean/docker-compose.yml --env-file $RUNTIME_ENV_FILE logs -f"
echo "  docker compose -f $APP_DIR/digitalocean/docker-compose.yml --env-file $RUNTIME_ENV_FILE exec app php /var/www/html/backend/artisan tinker"
echo "  docker compose -f $APP_DIR/digitalocean/docker-compose.yml --env-file $RUNTIME_ENV_FILE restart"
