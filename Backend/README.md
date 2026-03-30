# TLM_APP-BFA (LiptakoCare) — Backend API

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

| Composant | Technologie |
|-----------|-------------|
| Framework | Laravel 11 (PHP 8.2+) |
| Authentification | Laravel Passport 13.x (OAuth2) |
| Autorisation | Spatie Laravel Permission 6.x (RBAC) |
| Audit | Spatie Activity Log 4.x |
| Base de données | SQLite (dev) / MySQL (prod) |
| Chiffrement | AES-256 (champ par champ) |
| Temps réel | Pusher + Laravel Reverb (WebSocket) |

## Prérequis

- PHP 8.2+ (extensions : `pdo`, `mbstring`, `openssl`, `tokenizer`, `xml`, `bcmath`)
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

| Module | Endpoint de base | Description |
|--------|-----------------|-------------|
| Auth | `/api/auth/*` | Inscription, connexion, 2FA, mot de passe oublié |
| Patients | `/api/patients` | CRUD patients + dossier médical |
| Rendez-vous | `/api/appointments` | Gestion RDV + workflow (confirm/cancel/start/end) |
| Consultations | `/api/consultations` | Consultations + diagnostics + rapports |
| Prescriptions | `/api/prescriptions` | Prescriptions médicales |
| Téléexpertise | `/api/teleexpertise` | Avis spécialisés entre professionnels |
| Documents | `/api/documents` | Upload/download chiffré |
| Messages | `/api/messages` | Messagerie temps réel |
| Annuaire | `/api/directory/*` | Recherche médecins, spécialités, créneaux |
| Audit | `/api/audit/*` | Logs d'activité et rapports |
| Admin | `/api/admin/*` | Gestion utilisateurs, tableau de bord |

## Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| Administrateur | Gestion globale de la plateforme |
| Gestionnaire | Gestion des structures et services |
| Professionnel de Santé | Consultations, prescriptions, diagnostics |
| Secrétaire Médical | Accueil, prise de RDV, administration |
| Patient | Consultation de son dossier, prise de RDV |

## Sécurité

- **Authentification** : OAuth2 via Laravel Passport (tokens personnels)
- **Autorisation** : RBAC granulaire (Spatie Permission) — rôles et permissions
- **Chiffrement** : AES-256 au repos sur tous les champs médicaux sensibles
- **Contrôle d'accès** : `DossierAcces` pour accès aux dossiers patients
- **Audit** : Journalisation complète des opérations (Spatie Activity Log)
- **Fichiers** : Stockage chiffré via `EncryptedFileService`

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@tlm-bfa.bf` | `password` |
| Médecin | `dr.sawadogo@tlm-bfa.bf` | `password` |
| Spécialiste | `dr.compaore@tlm-bfa.bf` | `password` |
| Patient | `patient@tlm-bfa.bf` | `password` |

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `APP_KEY` | Clé de chiffrement Laravel |
| `DB_CONNECTION` | Driver BDD (`sqlite`, `mysql`, `pgsql`) |
| `PASSPORT_*` | Configuration OAuth2 |
| `PUSHER_*` | Clés Pusher (temps réel) |
| `TWILIO_SID`, `TWILIO_TOKEN` | SMS Twilio |
| `ORANGE_MONEY_*` | Paiement mobile |

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

Voir [DOCUMENTATION.md](../DOCUMENTATION.md) pour le MCD, la roadmap, les routes détaillées et l'architecture complète.
