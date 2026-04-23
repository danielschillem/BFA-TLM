#!/usr/bin/env bash
############################################################
# LiptakoCare — Script de déploiement DigitalOcean Droplet
# Usage : bash digitalocean/deploy.sh [domaine]
#
# Prérequis sur le Droplet :
#   - Ubuntu 22.04+ / Debian 12+
#   - SSH access root ou sudo
#
# Ce script installe Docker, clone le repo, et lance l'app.
############################################################
set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="https://gitlab.com/Schillem/esante_liptako.git"
APP_DIR="/opt/liptakocare"

echo "═══════════════════════════════════════════════════════"
echo "  LiptakoCare v3.0.0 — Déploiement DigitalOcean"
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
  git pull origin main
else
  echo "📥 Clonage du repo..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 3. Vérifier le fichier .env ──
if [ ! -f "$APP_DIR/digitalocean/.env" ]; then
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

# ── 4. Build & Lancement ──
echo "🔨 Build de l'image Docker (frontend + backend)..."
cd "$APP_DIR"
docker compose -f digitalocean/docker-compose.yml --env-file digitalocean/.env build --no-cache

echo "🚀 Lancement des services..."
docker compose -f digitalocean/docker-compose.yml --env-file digitalocean/.env up -d

# ── 5. SSL avec Certbot (si domaine fourni) ──
if [ -n "$DOMAIN" ]; then
  echo "🔒 Configuration SSL pour $DOMAIN..."

  if ! command -v certbot &>/dev/null; then
    apt-get install -y -qq certbot python3-certbot-nginx
  fi

  # Installer Nginx sur l'hôte comme reverse proxy SSL → Docker :80
  apt-get install -y -qq nginx

  cat > /etc/nginx/sites-available/liptakocare <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:80;
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

  ln -sf /etc/nginx/sites-available/liptakocare /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  # Docker écoute sur 8080 pour ne pas conflictuler avec Nginx hôte
  # Mettre à jour le port Docker
  sed -i 's|"${APP_PORT:-80}:80"|"127.0.0.1:8080:80"|' "$APP_DIR/digitalocean/docker-compose.yml"
  sed -i 's|proxy_pass http://127.0.0.1:80|proxy_pass http://127.0.0.1:8080|' /etc/nginx/sites-available/liptakocare

  docker compose -f digitalocean/docker-compose.yml --env-file digitalocean/.env up -d

  nginx -t && systemctl reload nginx

  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" --redirect || {
    echo "⚠️  Certbot a échoué — vérifiez que le DNS pointe vers ce serveur"
    echo "   Relancez manuellement : certbot --nginx -d $DOMAIN"
  }
fi

# ── 6. Vérification ──
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Déploiement terminé !"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Services :"
docker compose -f "$APP_DIR/digitalocean/docker-compose.yml" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
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
  echo "  bash $APP_DIR/digitalocean/deploy.sh votre-domaine.com"
fi
echo ""
echo "  Commandes utiles :"
echo "  docker compose -f $APP_DIR/digitalocean/docker-compose.yml logs -f"
echo "  docker compose -f $APP_DIR/digitalocean/docker-compose.yml exec app php /var/www/html/backend/artisan tinker"
echo "  docker compose -f $APP_DIR/digitalocean/docker-compose.yml restart"
