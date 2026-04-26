# BFA TLM — Déploiement DigitalOcean

> **Version** : 3.0.0 — 22 avril 2026  
> **Architecture** : Frontend (React) + Backend (Laravel) unifiés dans un seul conteneur Docker

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Droplet DigitalOcean                │
│                                                     │
│  ┌──── Nginx (reverse proxy SSL) ─── port 443 ──┐  │
│  │         certbot auto-renew                    │  │
│  └──────────────┬────────────────────────────────┘  │
│                 │ proxy_pass :8080                   │
│  ┌──────────────▼────────────────────────────────┐  │
│  │          Docker Compose                       │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  app (bfa-tlm-app) — port 80        │  │  │
│  │  │  ┌─────────────────────────────────┐    │  │  │
│  │  │  │  Nginx interne (port 80)        │    │  │  │
│  │  │  │  /         → SPA React (dist/)  │    │  │  │
│  │  │  │  /api/v1/  → PHP-FPM :9000      │    │  │  │
│  │  │  │  /app/     → Reverb WS :8080    │    │  │  │
│  │  │  └─────────────────────────────────┘    │  │  │
│  │  │  PHP-FPM 8.3 (Laravel)                  │  │  │
│  │  │  Supervisor (fpm + nginx + reverb + queue)│ │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  ┌──────────────┐  ┌───────────────────────┐  │  │
│  │  │  PostgreSQL   │  │  Redis 7              │  │  │
│  │  │  16-alpine    │  │  (cache/session/queue)│  │  │
│  │  └──────────────┘  └───────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Same-origin** : le frontend et l'API sont sur le même domaine → pas de CORS, cookies `SameSite` fonctionnent nativement.

---

## Prérequis

- **Droplet** : Ubuntu 22.04+, 2 vCPU / 4 Go RAM minimum (recommandé : 4 vCPU / 8 Go)
- **Domaine** : DNS A record pointant vers l'IP du Droplet
- **Accès SSH** : root ou utilisateur sudo

---

## Déploiement rapide (< 10 min)

### 1. Connexion au Droplet

```bash
ssh root@VOTRE_IP_DROPLET
```

### 2. Lancer le script de déploiement

```bash
# Cloner et déployer (sans SSL)
git clone https://github.com/danielschillem/BFA-TLM.git /opt/bfa-tlm
cd /opt/bfa-tlm

# Configurer l'environnement
cp digitalocean/.env.example digitalocean/.env
nano digitalocean/.env   # Remplir APP_KEY, DB_PASSWORD, etc.

# Déployer
bash digitalocean/deploy.sh

# OU déployer avec SSL automatique
bash digitalocean/deploy.sh votre-domaine.com

# Rebuild complet (plus lent, sans cache)
bash digitalocean/deploy.sh --full-rebuild
bash digitalocean/deploy.sh --full-rebuild votre-domaine.com
```

### 3. Générer la APP_KEY

```bash
# Depuis votre machine locale (dans le dossier Backend/)
php artisan key:generate --show
# Copier la valeur dans digitalocean/.env → APP_KEY=base64:xxxxx
```

---

## Fichiers de déploiement

| Fichier                                 | Description                                                                |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `digitalocean/Dockerfile`               | Build multi-stage : Node (frontend) + Composer (backend) + PHP-FPM runtime |
| `digitalocean/docker-compose.yml`       | Orchestration : app + PostgreSQL + Redis                                   |
| `digitalocean/nginx.conf`               | Nginx unifié (SPA + API + WebSocket)                                       |
| `digitalocean/supervisord.conf`         | Supervisor : PHP-FPM, Nginx, Reverb, Queue Worker                          |
| `digitalocean/entrypoint.sh`            | Migrations, seeding, cache, Passport                                       |
| `digitalocean/.env.example`             | Variables d'environnement template                                         |
| `Frontend/.env.production.digitalocean` | Config Vite pour le build DO                                               |

---

## Variables d'environnement

| Variable          | Requis | Description                                   |
| ----------------- | ------ | --------------------------------------------- |
| `APP_KEY`         | ✅     | Clé Laravel (base64:...)                      |
| `APP_URL`         | ✅     | URL publique (https://domaine.com)            |
| `DB_PASSWORD`     | ✅     | Mot de passe PostgreSQL                       |
| `LIVEKIT_WS_URL`  | ✅     | URL WebSocket LiveKit (ex: wss://xxx.livekit.cloud) |
| `LIVEKIT_API_KEY` | ✅     | Clé API LiveKit pour générer les tokens       |
| `LIVEKIT_API_SECRET` | ✅  | Secret API LiveKit                            |
| `REDIS_PASSWORD`  | ❌     | Mot de passe Redis (optionnel)                |
| `MAIL_HOST`       | ❌     | Serveur SMTP                                  |
| `MAIL_USERNAME`   | ❌     | Identifiant SMTP                              |
| `MAIL_PASSWORD`   | ❌     | Mot de passe SMTP                             |
| `FILESYSTEM_DISK` | ❌     | `local` ou `s3` (DO Spaces)                   |
| `AWS_*`           | ❌     | Credentials DO Spaces (si FILESYSTEM_DISK=s3) |
| `RUN_SEED`        | ❌     | `true` au premier déploiement                 |

---

## Commandes utiles

```bash
CD=/opt/bfa-tlm

# Logs en temps réel
docker compose -f $CD/digitalocean/docker-compose.yml logs -f

# Logs d'un service
docker compose -f $CD/digitalocean/docker-compose.yml logs -f app
docker compose -f $CD/digitalocean/docker-compose.yml logs -f postgres

# Shell dans le conteneur
docker compose -f $CD/digitalocean/docker-compose.yml exec app bash

# Artisan
docker compose -f $CD/digitalocean/docker-compose.yml exec app \
  php /var/www/html/backend/artisan tinker

# Migrations
docker compose -f $CD/digitalocean/docker-compose.yml exec app \
  php /var/www/html/backend/artisan migrate --force

# Redémarrer
docker compose -f $CD/digitalocean/docker-compose.yml restart

# Rebuild rapide après mise à jour du code (cache activé)
cd $CD && git pull origin main
docker compose -f digitalocean/docker-compose.yml --env-file digitalocean/.env build
docker compose -f digitalocean/docker-compose.yml --env-file digitalocean/.env up -d
```

---

## Mise à jour (CI/CD ou manuelle)

```bash
cd /opt/bfa-tlm
git pull origin main
docker compose -f digitalocean/docker-compose.yml --env-file digitalocean/.env build
docker compose -f digitalocean/docker-compose.yml --env-file digitalocean/.env up -d
```

Temps d'arrêt : ~30s pendant le rebuild. Pour du zero-downtime, utiliser un rolling update avec un second conteneur.

---

## SSL

Le script `deploy.sh` configure automatiquement Certbot + Nginx si un domaine est fourni. Pour renouveler manuellement :

```bash
certbot renew --dry-run
```

Le renouvellement automatique est configuré par Certbot via un cron/systemd timer.

---

## Sauvegardes

### Base de données

```bash
# Dump
docker compose -f /opt/bfa-tlm/digitalocean/docker-compose.yml \
  exec postgres pg_dump -U bfatlm bfatlm > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose -f /opt/bfa-tlm/digitalocean/docker-compose.yml \
  exec -T postgres psql -U bfatlm bfatlm
```

### Fichiers uploadés

```bash
# Si FILESYSTEM_DISK=local
docker compose -f /opt/bfa-tlm/digitalocean/docker-compose.yml \
  cp app:/var/www/html/backend/storage/app ./backup-storage/
```

---

## DigitalOcean Spaces (stockage S3)

Pour stocker les documents médicaux sur DO Spaces au lieu du filesystem local :

1. Créer un Space dans la console DO
2. Créer une clé API (Spaces access key)
3. Configurer dans `digitalocean/.env` :

```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=DO_SPACES_KEY
AWS_SECRET_ACCESS_KEY=DO_SPACES_SECRET
AWS_DEFAULT_REGION=fra1
AWS_BUCKET=bfa-tlm-docs
AWS_ENDPOINT=https://fra1.digitaloceanspaces.com
```

---

## Monitoring

### Healthcheck

```bash
curl -s http://localhost/up
# {"status":"ok"}
```

### Ressources

```bash
docker stats --no-stream
```

### DigitalOcean Monitoring

Activer dans la console DO : **Droplet → Monitoring** → alertes CPU/RAM/Disk.
