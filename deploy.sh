#!/bin/bash
############################################################
# LiptakoCare (TLM_APP-BFA) — Script de déploiement
# © 2025-2026 Alternatives-IT (AIT) & ANABASE INC
# Licence : Propriétaire — Tous droits réservés
# Version : 3.0.0
# Usage : bash deploy.sh [--fresh]
#   --fresh : migration complète (ATTENTION : efface les données)
# Variables utiles :
#   FRONTEND_BUILD_MODE=production|production.hostinger
############################################################

set -euo pipefail

echo "========================================="
echo "  LiptakoCare v3.0.0 — Déploiement"
echo "  © Alternatives-IT & ANABASE INC"
echo "========================================="

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Arguments
FRESH_MIGRATE=false
if [ "${1:-}" = "--fresh" ]; then
    FRESH_MIGRATE=true
fi

# Répertoires
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/Backend"
FRONTEND_DIR="$SCRIPT_DIR/Frontend"
SPA_DIR="$BACKEND_DIR/public/spa"
FRONTEND_BUILD_MODE="${FRONTEND_BUILD_MODE:-production}"
BACKEND_ENV_TEMPLATE=".env.production"

if [ "$FRONTEND_BUILD_MODE" = "production.hostinger" ]; then
    BACKEND_ENV_TEMPLATE=".env.production.hostinger"
fi

# =============================================
# 0. PRÉ-VÉRIFICATIONS
# =============================================
echo -e "\n${YELLOW}[0/7] Vérifications préalables...${NC}"

# Vérifier que PHP est disponible
if ! command -v php &> /dev/null; then
    echo -e "${RED}✗ PHP introuvable. Installez PHP 8.2+${NC}"
    exit 1
fi

# Vérifier que Node est disponible
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js introuvable. Installez Node 18+${NC}"
    exit 1
fi

# Vérifier que Composer est disponible
if ! command -v composer &> /dev/null; then
    echo -e "${RED}✗ Composer introuvable.${NC}"
    exit 1
fi

# Vérifier le .env de production
if [ ! -f "$BACKEND_DIR/.env" ] && [ ! -f "$BACKEND_DIR/$BACKEND_ENV_TEMPLATE" ]; then
    echo -e "${RED}✗ Aucun fichier .env trouvé ! Créez Backend/.env à partir de $BACKEND_ENV_TEMPLATE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prérequis validés${NC}"

# =============================================
# 1. MODE MAINTENANCE
# =============================================
echo -e "\n${YELLOW}[1/7] Activation mode maintenance...${NC}"
cd "$BACKEND_DIR"
php artisan down --retry=60 --refresh=15 2>/dev/null || true
echo -e "${GREEN}✓ Mode maintenance activé${NC}"

# =============================================
# 2. BUILD FRONTEND
# =============================================
echo -e "\n${YELLOW}[2/7] Build du frontend React...${NC}"
cd "$FRONTEND_DIR"
npm ci --production=false
echo -e "${YELLOW}       Mode frontend : ${FRONTEND_BUILD_MODE}${NC}"
node scripts/generate-runtime-config.mjs "$FRONTEND_BUILD_MODE"
npx vite build --mode "$FRONTEND_BUILD_MODE"

# Copier le build dans Laravel public/spa/
echo -e "${YELLOW}       Copie du build vers Backend/public/spa/...${NC}"
rm -rf "$SPA_DIR"
mkdir -p "$SPA_DIR"
cp -r dist/* "$SPA_DIR/"
echo -e "${GREEN}✓ Frontend déployé dans public/spa/${NC}"

# =============================================
# 3. BACKEND LARAVEL
# =============================================
echo -e "\n${YELLOW}[3/7] Installation des dépendances backend...${NC}"
cd "$BACKEND_DIR"
composer install --no-dev --optimize-autoloader --no-interaction

# =============================================
# 4. CONFIGURATION PRODUCTION
# =============================================
echo -e "\n${YELLOW}[4/7] Configuration production...${NC}"

# Copier le template backend si .env n'existe pas
if [ ! -f .env ]; then
    cp "$BACKEND_ENV_TEMPLATE" .env
    echo -e "${YELLOW}⚠  .env copié depuis $BACKEND_ENV_TEMPLATE${NC}"
fi

# Vérifier que APP_DEBUG est bien désactivé
if grep -q "^APP_DEBUG=true" .env; then
    echo -e "${RED}✗ DANGER : APP_DEBUG=true détecté dans .env ! Corrigez avant de continuer.${NC}"
    php artisan up 2>/dev/null || true
    exit 1
fi

# Vérifier que APP_ENV est bien production
if ! grep -q "^APP_ENV=production" .env; then
    echo -e "${RED}✗ DANGER : APP_ENV n'est pas 'production' dans .env !${NC}"
    php artisan up 2>/dev/null || true
    exit 1
fi

# Générer la clé si vide
if grep -q "^APP_KEY=$" .env; then
    php artisan key:generate --force
    echo -e "${GREEN}✓ APP_KEY générée${NC}"
fi

# =============================================
# 5. BASE DE DONNÉES
# =============================================
echo -e "\n${YELLOW}[5/7] Migrations base de données...${NC}"

if [ "$FRESH_MIGRATE" = true ]; then
    echo -e "${YELLOW}⚠  Migration FRESH demandée — TOUTES les données seront effacées !${NC}"
    read -p "Confirmer ? (tapez 'oui') : " confirm
    if [ "$confirm" = "oui" ]; then
        php artisan migrate:fresh --force --seed --seeder=ProductionSeeder
        echo -e "${GREEN}✓ Migration fresh + ProductionSeeder exécuté${NC}"
    else
        echo -e "${YELLOW}Migration fresh annulée — exécution des migrations normales${NC}"
        php artisan migrate --force
    fi
else
    php artisan migrate --force
fi

# Générer les clés Passport si nécessaires
php artisan passport:keys --force 2>/dev/null || true

# Créer le lien storage
php artisan storage:link 2>/dev/null || true

# =============================================
# 6. OPTIMISATION LARAVEL
# =============================================
echo -e "\n${YELLOW}[6/7] Optimisation Laravel...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Permissions des dossiers
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

echo -e "${GREEN}✓ Caches optimisés${NC}"

# =============================================
# 7. DÉSACTIVATION MODE MAINTENANCE
# =============================================
echo -e "\n${YELLOW}[7/7] Remise en ligne...${NC}"
php artisan up

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  ✓ Déploiement terminé !${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Checklist post-déploiement :"
echo "  1. Vérifier .env (APP_URL, DB_*, MAIL_*, CORS_ALLOWED_ORIGINS)"
echo "  1b. Vérifier FRONTEND_BUILD_MODE si vous utilisez Hostinger ou un frontend sur un autre host"
echo "  2. Configurer le DocumentRoot Apache/Nginx → Backend/public/"
echo "  3. Activer SSL (Let's Encrypt / Certbot)"
echo "  4. Tester : https://VOTRE_DOMAINE"
echo "  5. Configurer le cron Laravel : * * * * * php artisan schedule:run"
echo "  6. Lancer le worker de queue : php artisan queue:work --daemon"
echo "  7. Lancer Reverb WebSocket : php artisan reverb:start"
echo ""
