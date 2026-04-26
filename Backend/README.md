# TLM_APP-BFA (BFA TLM) — Backend API

**Plateforme de Télémédecine du Burkina Faso**

**Version :** 3.0.0 — 26 mars 2026  
**Développeur :** Alternatives-IT (AIT)  
**Financé par :** ANABASE INC  
**Licence :** Propriétaire — Alternatives-IT & ANABASE INC  
**Copyright :** © 2025-2026 Alternatives-IT & ANABASE INC. Tous droits réservés.

---

## Présentation

API REST pour la plateforme de télémédecine **TLM_APP-BFA**. Gère le parcours patient complet : dossiers médicaux, consultations, prescriptions, examens, diagnostics, rendez-vous (présentiel et téléconsultation), paiements (Orange Money) et communication temps réel entre professionnels de santé.

## Stack technique

| Composant        | Technologie                          |
| ---------------- | ------------------------------------ |
| Framework        | Laravel 11 (PHP 8.3)                 |
| Authentification | Laravel Passport 13.x (OAuth2)       |
| Autorisation     | Spatie Laravel Permission 6.x (RBAC) |
| Audit            | Spatie Activity Log 4.x              |
| Base de données  | SQLite (dev) / MySQL (prod)          |
| Chiffrement      | AES-256 (champ par champ)            |
| Temps réel       | Pusher + Laravel Reverb (WebSocket)  |

## Prérequis

- PHP 8.3+ (extensions : `pdo`, `mbstring`, `openssl`, `tokenizer`, `xml`, `bcmath`)
- Composer 2.x
- Node.js 18+ & NPM
- MySQL 8.x (ou SQLite pour développement local)

## Installation

```bash
# 1. Installer les dépendances
composer install
npm install

# 2. Configurer l'environnement
cp .env.example .env
php artisan key:generate

# 3. Configurer la BDD dans .env
# DB_CONNECTION=sqlite   (dev)
# DB_CONNECTION=mysql     (prod)

# 4. Migrations & seed
php artisan migrate --seed

# 5. Installer Passport
echo "0" | php artisan passport:client --personal --name="TLM-BFA-Personal"

# 6. Lancer le serveur
php artisan serve --port=8000
```

## Structure du projet

```
app/
├── Http/
│   ├── Controllers/API/     # 11 contrôleurs API REST
│   ├── Requests/            # Validation des requêtes
│   └── Resources/           # Formatage JSON (API Resources)
├── Models/                  # 28 modèles Eloquent
├── Services/                # Services métier (chiffrement, paiement, SMS)
└── Providers/
database/
├── migrations/              # 29 migrations
└── seeders/                 # Données initiales
routes/
└── api.php                  # Routes API
```

## Modules API

| Module            | Endpoint de base            | Description                                       |
| ----------------- | --------------------------- | ------------------------------------------------- |
| Auth              | `/api/v1/auth/*`            | Inscription, connexion, 2FA, mot de passe oublié  |
| Patients          | `/api/v1/patients`          | CRUD patients + dossier médical                   |
| Rendez-vous       | `/api/v1/appointments`      | Gestion RDV + workflow (confirm/cancel/start/end) |
| Consultations     | `/api/v1/consultations`     | Consultations + diagnostics + rapports + PDF      |
| Prescriptions     | `/api/v1/prescriptions`     | Prescriptions médicales                           |
| Téléexpertise     | `/api/v1/teleexpertise`     | Avis spécialisés entre professionnels             |
| Documents         | `/api/v1/documents`         | Upload/download chiffré                           |
| Messages          | `/api/v1/messages`          | Messagerie                                        |
| Annuaire          | `/api/v1/directory/*`       | Recherche médecins, spécialités, créneaux         |
| Paiements         | `/api/v1/payments`          | Orange Money, Moov Money, carte, espèces          |
| Consentements     | `/api/v1/consents`          | Consentement patient OMS/RGPD                     |
| FHIR R4           | `/api/v1/fhir/*`            | Interopérabilité HL7 FHIR (12 ressources)         |
| CDA R2            | `/api/v1/cda/*`             | Documents cliniques XML (CCD, notes)              |
| ICD-11            | `/api/v1/icd11/*`           | Classification OMS                                |
| SNOMED CT / ATC   | `/api/v1/terminology/*`     | Terminologies médicales                           |
| DICOM             | `/api/v1/dicom/*`           | Imagerie médicale (dcm4chee)                      |
| DHIS2 / ENDOS     | `/api/v1/dhis2/*`           | Système national d'information sanitaire          |
| Certificats décès | `/api/v1/certificats-deces` | Certification causes de décès (OMS)               |
| Audit             | `/api/v1/audit/*`           | Logs d'activité et rapports                       |
| Admin             | `/api/v1/admin/*`           | Gestion utilisateurs, tableau de bord             |
| Gestionnaire      | `/api/v1/gestionnaire/*`    | Gestion PS et salles de structure                 |
| Notifications     | `/api/v1/notifications`     | Centre de notifications                           |
| Licences          | `/api/v1/licenses`          | Grille tarifaire et simulation                    |

## Rôles utilisateurs

| Rôle                   | Description                               |
| ---------------------- | ----------------------------------------- |
| Administrateur         | Gestion globale de la plateforme          |
| Gestionnaire           | Gestion des structures et services        |
| Professionnel de Santé | Consultations, prescriptions, diagnostics |
| Secrétaire Médical     | Accueil, prise de RDV, administration     |
| Patient                | Consultation de son dossier, prise de RDV |

## Sécurité

- **Authentification** : OAuth2 via Laravel Passport (tokens personnels)
- **Autorisation** : RBAC granulaire (Spatie Permission) — rôles et permissions
- **Chiffrement** : AES-256 au repos sur tous les champs médicaux sensibles
- **Contrôle d'accès** : `DossierAcces` pour accès aux dossiers patients
- **Audit** : Journalisation complète des opérations (Spatie Activity Log)
- **Fichiers** : Stockage chiffré via `EncryptedFileService`

## Comptes de test

| Rôle        | Email                    | Mot de passe |
| ----------- | ------------------------ | ------------ |
| Admin       | `admin@tlm-bfa.bf`       | `password`   |
| Médecin     | `dr.sawadogo@tlm-bfa.bf` | `password`   |
| Spécialiste | `dr.compaore@tlm-bfa.bf` | `password`   |
| Patient     | `patient@tlm-bfa.bf`     | `password`   |

## Variables d'environnement

| Variable                     | Description                             |
| ---------------------------- | --------------------------------------- |
| `APP_KEY`                    | Clé de chiffrement Laravel              |
| `DB_CONNECTION`              | Driver BDD (`sqlite`, `mysql`, `pgsql`) |
| `PASSPORT_*`                 | Configuration OAuth2                    |
| `PUSHER_*`                   | Clés Pusher (temps réel)                |
| `TWILIO_SID`, `TWILIO_TOKEN` | SMS Twilio                              |
| `ORANGE_MONEY_*`             | Paiement mobile                         |

## Commandes utiles

```bash
# Recréer la base + données
php artisan migrate:fresh --seed --force

# Recréer le client Passport
echo "0" | php artisan passport:client --personal --name="TLM-BFA-Personal"

# Lancer les tests
php artisan test

# Lancer le serveur
php artisan serve --port=8000
```

## Documentation complète

- **Documentation API interactive (Swagger)** : [http://localhost:8000/docs/api](http://localhost:8000/docs/api)
- **Spec OpenAPI JSON** : [http://localhost:8000/docs/api.json](http://localhost:8000/docs/api.json)
- **Export statique** : `php artisan scramble:export` → `api.json`
- **Documentation projet** : [DOCUMENTATION.md](../DOCUMENTATION.md) (MCD, roadmap, architecture)

## Déploiement en production

### Prérequis serveur

- Ubuntu 22.04+ ou Debian 12+
- PHP 8.3+ (FPM) avec extensions : `pdo_mysql`, `mbstring`, `openssl`, `xml`, `bcmath`, `gd`, `zip`
- MySQL 8.x ou PostgreSQL 15+
- Nginx ou Apache
- Composer 2.x
- Supervisor (pour les queues)
- Redis (cache & sessions, recommandé)

### Étapes de déploiement

```bash
# 1. Cloner et configurer
git clone <repo-url> /var/www/tlm-bfa
cd /var/www/tlm-bfa/Backend
cp .env.example .env

# 2. Configurer .env pour la production
# APP_ENV=production
# APP_DEBUG=false
# APP_URL=https://api.tlm-bfa.bf
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_DATABASE=tlm_bfa
# DB_USERNAME=tlm_user
# DB_PASSWORD=<mot_de_passe_fort>
# FRONTEND_URL=https://app.tlm-bfa.bf
# CACHE_STORE=redis
# SESSION_DRIVER=redis

# 3. Installer et optimiser
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan passport:client --personal --name="TLM-BFA-Personal"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 4. Permissions fichiers
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# 5. Configurer Supervisor pour les queues
# /etc/supervisor/conf.d/tlm-bfa-worker.conf
# [program:tlm-bfa-worker]
# command=php /var/www/tlm-bfa/Backend/artisan queue:work --tries=3 --max-time=3600
# autostart=true
# autorestart=true
# user=www-data
# redirect_stderr=true

# 6. Configurer Nginx (voir ci-dessous)
```

### Configuration Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.tlm-bfa.bf;

    root /var/www/tlm-bfa/Backend/public;
    index index.php;

    ssl_certificate     /etc/ssl/certs/tlm-bfa.pem;
    ssl_certificate_key /etc/ssl/private/tlm-bfa.key;

    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Commandes de maintenance

```bash
# Vider les caches
php artisan cache:clear && php artisan config:clear && php artisan route:clear

# Scheduler (crontab)
* * * * * cd /var/www/tlm-bfa/Backend && php artisan schedule:run >> /dev/null 2>&1

# Lancer les tests
php artisan test

# Exporter la doc API
php artisan scramble:export
```
