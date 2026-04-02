# LiptakoCare v3.0.0 — Guide de Mise en Production

> © 2025-2026 Alternatives-IT (AIT) & ANABASE INC — Tous droits réservés

---

## Prérequis serveur

| Composant        | Version minimale | Recommandé        |
|------------------|------------------|--------------------|
| PHP              | 8.2              | 8.3                |
| MySQL / MariaDB  | 8.0 / 10.6       | 8.0 / 11.x        |
| Node.js          | 18 LTS           | 20 LTS             |
| Nginx            | 1.18+            | 1.24+              |
| Composer         | 2.x              | 2.7+               |
| Certbot (SSL)    | —                | Dernière version   |

### Extensions PHP requises
```
php-mbstring php-xml php-curl php-zip php-gd php-mysql php-bcmath php-intl php-tokenizer php-json
```

---

## Étapes de déploiement

### 1. Préparer le serveur

```bash
# Installer les dépendances
sudo apt update && sudo apt install -y nginx php8.2-fpm php8.2-mbstring php8.2-xml \
  php8.2-curl php8.2-zip php8.2-gd php8.2-mysql php8.2-bcmath php8.2-intl \
  mysql-server certbot python3-certbot-nginx unzip git nodejs npm

# Créer le dossier
sudo mkdir -p /var/www/liptakocare
sudo chown $USER:www-data /var/www/liptakocare
```

### 2. Transférer le code

```bash
# Option A — Git
cd /var/www/liptakocare
git clone <REPO_URL> .

# Option B — SCP/rsync
rsync -avz --exclude=node_modules --exclude=vendor ./ user@server:/var/www/liptakocare/
```

### 3. Configurer l'environnement

```bash
cd /var/www/liptakocare/Backend

# Copier et adapter le fichier de configuration
cp .env.production .env
nano .env   # ← Remplir TOUTES les valeurs __À_DÉFINIR__
```

**Valeurs OBLIGATOIRES à configurer :**
- `APP_URL` — URL HTTPS de l'API ou du site selon votre architecture
- `FRONTEND_URL` — URL HTTPS du frontend si l'UI n'est pas servie depuis exactement le même host
- `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` — Base de données MySQL
- `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD` — Serveur SMTP
- `CORS_ALLOWED_ORIGINS` — Domaines frontend autorisés, sans slash final
- `SESSION_DOMAIN` — Domaine (ex: liptakocare.bf)

**Recommandation anti-CORS :**
- Si vous utilisez `deploy.sh` + `nginx.conf` de ce dépôt, gardez le frontend et l'API sur le même host et utilisez `Frontend/.env.production` avec `VITE_API_URL=/api/v1`.
- Si l'API est sur un sous-domaine séparé comme `api.votre-domaine.tld`, renseignez `FRONTEND_URL=https://votre-domaine.tld` et `CORS_ALLOWED_ORIGINS=https://votre-domaine.tld,https://www.votre-domaine.tld`.
- Si vous déployez des previews Hostinger dont le sous-domaine change, vous pouvez autoriser le pattern `https://*.hostingersite.com` directement dans `CORS_ALLOWED_ORIGINS`.
- `Frontend/public/app-config.runtime.js` est désormais généré automatiquement pendant le build. Ne l'éditez pas manuellement.

**Mode Gateway CDN (Hostinger hcdn) :**
Le CDN Hostinger (hcdn) intercepte les requêtes vers les URL propres (`/api/v1/...`) et renvoie 404/405 avant qu'Apache ne puisse les router. Seul `/index.php` est transmis à PHP. Le fichier `Backend/public/index.php` intègre un gateway qui lit le chemin API réel depuis le header `X-Api-Path`. Côté frontend, quand `VITE_API_URL` se termine par `/index.php`, le client Axios active automatiquement le mode gateway.

- Backend `.env` : `CORS_ALLOWED_ORIGINS=https://aqua-weasel-241472.hostingersite.com`
- Frontend `.env` : `VITE_API_URL=https://ivory-tarsier-376970.hostingersite.com/index.php`

**Couple Hostinger actuellement intégré dans le dépôt :**
- Frontend : `https://aqua-weasel-241472.hostingersite.com`
- API (gateway) : `https://ivory-tarsier-376970.hostingersite.com/index.php`
- CORS backend : `CORS_ALLOWED_ORIGINS=https://aqua-weasel-241472.hostingersite.com`

### 4. Créer la base de données MySQL

```sql
CREATE DATABASE liptakocare_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'liptakocare_user'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON liptakocare_prod.* TO 'liptakocare_user'@'localhost';
FLUSH PRIVILEGES;
```

### 5. Lancer le déploiement

```bash
cd /var/www/liptakocare

# Premier déploiement (migration complète + seeder production)
bash deploy.sh --fresh

# Déploiements suivants (migrations incrémentales uniquement)
bash deploy.sh

# Build Hostinger / frontend sur un host différent
FRONTEND_BUILD_MODE=production.hostinger bash deploy.sh
```

### 6. Configurer Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/liptakocare
sudo ln -s /etc/nginx/sites-available/liptakocare /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/liptakocare   # ← Remplacer __À_DÉFINIR__

sudo nginx -t
sudo systemctl reload nginx
```

### 7. Activer SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d votre-domaine.bf
```

### 8. Configurer les services système

#### Cron Laravel (tâches planifiées)
```bash
sudo crontab -e -u www-data
# Ajouter :
* * * * * cd /var/www/liptakocare/Backend && php artisan schedule:run >> /dev/null 2>&1
```

#### Worker de queue (traitement asynchrone)
```bash
# Créer /etc/systemd/system/liptakocare-queue.service
[Unit]
Description=LiptakoCare Queue Worker
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/liptakocare/Backend
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --max-time=3600
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable liptakocare-queue
sudo systemctl start liptakocare-queue
```

#### WebSocket Reverb (temps réel)
```bash
# Créer /etc/systemd/system/liptakocare-reverb.service
[Unit]
Description=LiptakoCare Reverb WebSocket
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/liptakocare/Backend
ExecStart=/usr/bin/php artisan reverb:start --host=0.0.0.0 --port=8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable liptakocare-reverb
sudo systemctl start liptakocare-reverb
```

---

## Checklist de sécurité

| # | Élément                              | Statut |
|---|--------------------------------------|--------|
| 1 | `APP_DEBUG=false`                    | ☐      |
| 2 | `APP_ENV=production`                 | ☐      |
| 3 | APP_KEY générée (unique au serveur)  | ☐      |
| 4 | HTTPS activé (Certbot)              | ☐      |
| 5 | `SESSION_SECURE_COOKIE=true`         | ☐      |
| 6 | `SESSION_HTTP_ONLY=true`             | ☐      |
| 7 | `SESSION_ENCRYPT=true`               | ☐      |
| 8 | CORS limité au domaine prod          | ☐      |
| 9 | Clés Passport générées               | ☐      |
| 10| Mot de passe admin changé            | ☐      |
| 11| Comptes de test supprimés            | ☐      |
| 12| Fichiers .env non accessibles (Nginx)| ☐      |
| 13| Logs en mode `warning` minimum       | ☐      |
| 14| Backup BDD configuré                 | ☐      |
| 15| 2FA actif pour médecins/admins       | ☐      |
| 16| SMTP fonctionnel (test email)        | ☐      |

---

## Vérification post-déploiement

```bash
# 1. Vérifier que l'app répond
curl -s -o /dev/null -w "%{http_code}" https://votre-domaine.bf/api/v1/fhir/metadata
# Doit retourner 200

# 2. Vérifier le health check Laravel
curl -s https://votre-domaine.bf/up
# Doit retourner 200

# 3. Vérifier les logs
tail -f /var/www/liptakocare/Backend/storage/logs/laravel.log

# 4. Vérifier les services
sudo systemctl status liptakocare-queue
sudo systemctl status liptakocare-reverb
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
```

---

## Commandes utiles

```bash
# Mode maintenance
php artisan down --retry=60
php artisan up

# Vider les caches
php artisan optimize:clear

# Reconstruire les caches
php artisan config:cache && php artisan route:cache && php artisan view:cache

# Voir les logs en temps réel
tail -f storage/logs/laravel.log

# Relancer le worker de queue
sudo systemctl restart liptakocare-queue

# Backup base de données
mysqldump -u liptakocare_user -p liptakocare_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```
