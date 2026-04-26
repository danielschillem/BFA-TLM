# TLM_APP-BFA (BFA TLM) — Plateforme de Télémédecine du Burkina Faso

**Version :** 3.0.0 — 26 mars 2026  
**Développeur :** Alternatives-IT (AIT)  
**Financé par :** ANABASE INC  
**Framework :** Laravel 11.50 · PHP 8.3 | React 18 · Vite 5  
**Licence :** Propriétaire — Alternatives-IT & ANABASE INC  
**Copyright :** © 2025-2026 Alternatives-IT & ANABASE INC. Tous droits réservés.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture technique](#2-architecture-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Workflow hiérarchique](#4-workflow-hiérarchique)
5. [Modèle Conceptuel de Données (MCD)](#5-modèle-conceptuel-de-données-mcd)
6. [MVP — Produit Minimum Viable](#6-mvp--produit-minimum-viable)
7. [Roadmap](#7-roadmap)
8. [API — Routes principales](#8-api--routes-principales)
9. [Sécurité & conformité](#9-sécurité--conformité)
10. [Dépendances](#10-dépendances)
11. [Installation & déploiement](#11-installation--déploiement)
12. [Interopérabilité](#12-interopérabilité)
13. [Temps réel (WebSocket)](#13-temps-réel-websocket)
14. [CI/CD & Déploiement Hostinger](#14-cicd--déploiement-hostinger)

---

## 1. Présentation du projet

**TLM_APP-BFA** est une plateforme de **télémédecine** destinée au système de santé du **Burkina Faso**. Elle permet la gestion complète du parcours patient (dossier médical, consultations, prescriptions, examens, diagnostics), la prise de rendez-vous (en présentiel et en téléconsultation), le paiement en ligne via **Orange Money**, et la communication en temps réel entre professionnels de santé.

### Objectifs principaux

- Digitaliser les dossiers médicaux des patients
- Permettre les téléconsultations vidéo (LiveKit WebRTC)
- Gérer les rendez-vous, prescriptions, examens et diagnostics
- Assurer la traçabilité et la conformité des accès aux données de santé
- Intégrer les paiements mobiles (Orange Money)
- Notifier les patients par SMS (Twilio) et en temps réel (WebSocket)

---

## 2. Architecture technique

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (SPA / Mobile)                 │
│              Consommateur d'API REST + WebSocket         │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTPS / WSS
┌──────────────────────▼──────────────────────────────────┐
│                 BACKEND LARAVEL 11                       │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Controllers  │  │  Middleware   │  │   Requests    │  │
│  │   (API)      │  │ (Auth, CORS) │  │ (Validation)  │  │
│  └──────┬───────┘  └──────────────┘  └───────────────┘  │
│         │                                               │
│  ┌──────▼───────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Repositories │  │   Services   │  │   Resources   │  │
│  │ (Data Layer) │  │  (Business)  │  │ (Formatage)   │  │
│  └──────┬───────┘  └──────────────┘  └───────────────┘  │
│         │                                               │
│  ┌──────▼───────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Models      │  │   Events     │  │ Notifications │  │
│  │  (Eloquent)   │  │ (Broadcast)  │  │ (SMS/Push)    │  │
│  └──────┬───────┘  └──────────────┘  └───────────────┘  │
└─────────┼───────────────────────────────────────────────┘
          │
┌─────────▼────────┐  ┌────────────┐  ┌──────────────────┐
│   Base de données │  │   Pusher   │  │  Services tiers  │
│   MySQL / SQLite  │  │ (Realtime) │  │ Twilio, Google,  │
│   65+ tables      │  │            │  │ Orange Money     │
└──────────────────┘  └────────────┘  └──────────────────┘
```

### Stack technologique (état réel du code)

| Composant           | Technologie                         |
| ------------------- | ----------------------------------- |
| Backend             | Laravel 11 (PHP 8.3)                |
| Authentification    | Laravel Sanctum (session + token)   |
| Autorisation (RBAC) | Spatie Laravel Permission           |
| Audit / Traçabilité | Spatie Activity Log                 |
| Temps réel          | Laravel Reverb + Pusher protocol    |
| SMS                 | Twilio SDK                          |
| Visioconférence     | LiveKit (WebRTC SFU)                |
| Paiement            | Orange Money SDK                    |
| Chiffrement         | AES-256 (champ par champ)           |
| Frontend assets     | Vite + Bootstrap 5 + TailwindCSS    |

---

## 3. Structure du projet

```
Backend/
├── app/
│   ├── Console/Commands/          # Commandes Artisan personnalisées
│   ├── Events/                    # Événements (rendez-vous, rappels)
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── API/               # 15 contrôleurs API REST
│   │   ├── Middleware/            # Middleware (auth, CORS, etc.)
│   │   ├── Requests/             # Form Requests (validation)
│   │   └── Resources/            # API Resources (formatage JSON)
│   ├── Models/                    # 42 modèles Eloquent
│   ├── Notifications/             # Notifications SMS & push
│   ├── Policies/                  # Politiques d'autorisation
│   ├── Providers/                 # Fournisseurs de services
│   ├── Repositories/             # Repositories (couche données)
│   ├── Rules/                     # Règles de validation custom
│   └── Services/                  # 3 services métier
│       ├── EncryptedFileService   # Chiffrement/déchiffrement fichiers
│       ├── OrangeMoneyService     # Paiement mobile
│       └── TwilioService         # Envoi de SMS
├── config/                        # Configuration Laravel
├── database/
│   ├── migrations/                # 39 migrations
│   ├── seeders/                   # Données initiales
│   └── factories/                 # Factories (tests)
├── routes/
│   ├── api.php                    # 96 routes API
│   ├── web.php                    # Routes web
│   └── channels.php              # Canaux WebSocket
├── storage/                       # Fichiers uploadés & logs
└── tests/                         # Tests PHPUnit
```

### Rôles utilisateurs

| Rôle                          | Slug                  | Description                                                     |
| ----------------------------- | --------------------- | --------------------------------------------------------------- |
| **Administrateur Système**    | `admin`               | Gestion globale : type de structures, structures, gestionnaires |
| **Gestionnaire de Structure** | `structure_manager`   | Crée les PS, les affecte aux structures et services             |
| **Médecin**                   | `doctor`              | Consultations, prescriptions, diagnostics, examens              |
| **Spécialiste**               | `specialist`          | Téléexpertise, avis spécialisé, consultations                   |
| **Professionnel de Santé**    | `health_professional` | Soins, gestion quotidienne des patients                         |
| **Patient**                   | `patient`             | Consultation de son dossier, prise de RDV                       |

---

## 4. Workflow hiérarchique

Le système suit un modèle de création descendant strict :

```
┌─────────────────────────────────────────────────────────────┐
│  1. ADMINISTRATEUR                                          │
│     ├── Crée les TypeStructures (CHU, CMA, CSPS, etc.)      │
│     ├── Crée les Structures de santé                        │
│     └── Crée les Gestionnaires et les affecte aux structures│
├─────────────────────────────────────────────────────────────┤
│  2. GESTIONNAIRE DE STRUCTURE                               │
│     ├── Crée les Professionnels de Santé (PS)               │
│     ├── Affecte les PS aux structures et services           │
│     └── Gère le tableau de bord de sa structure             │
├─────────────────────────────────────────────────────────────┤
│  3. PROFESSIONNEL DE SANTÉ (Médecin / Spécialiste / PS)     │
│     ├── Crée les patients                                   │
│     ├── Gère les dossiers médicaux                          │
│     ├── Réalise les consultations                           │
│     └── Prescrit examens, diagnostics, traitements          │
├─────────────────────────────────────────────────────────────┤
│  4. PATIENT                                                 │
│     ├── S'inscrit de manière autonome (rôle patient unique) │
│     ├── Consulte son dossier médical                        │
│     └── Prend des rendez-vous                               │
└─────────────────────────────────────────────────────────────┘
```

**Traçabilité :** Chaque entité créée possède un champ `created_by_id` relié à l'utilisateur créateur, assurant un audit complet de la chaîne de création.

---

## 5. Modèle Conceptuel de Données (MCD)

### Diagramme entité-relation (notation textuelle)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GESTION DES UTILISATEURS & STRUCTURES                  │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌──────────────┐       ┌──────────────┐         ┌──────────┐
 │TypeStructure │1─────*│  Structure   │*───────1│   Pays   │
 │              │       │              │         │          │
 │ libelle      │       │ libelle      │         │ nom      │
 │ description  │       │ telephone    │         │ code     │
 │ actif        │       │ telephone_2  │         └──────────┘
 └──────────────┘       │ email        │
                        │ date_creation│         ┌──────────┐
 ┌──────────────┐       │ parent_id  ──┤(auto-   │  Grade   │
 │ Localite     │1─────*│ created_by ──┤réf.)    │          │
 │              │       └──────┬───────┘         │ libelle  │
 │ region       │              │1                │ code     │
 │ province     │       ┌──────▼───────┐         └────┬─────┘
 │ commune      │       │   Service    │              │1
 │ village      │       │              │         ┌────▼─────┐
 └──────────────┘       │ libelle      │         │   User   │
                        │ code         │         │          │
                        │ telephone    │         │ nom          │
                        │ telephone_2  │         │ prenoms      │
                        └──────┬───────┘         │ email        │
                               │                 │ lieu_naissance│
                               │*  (pivot        │ date_naissance│
                        ┌──────▼───────┐ service_│ specialite   │
                        │ service_user │ _user)  │ matricule    │
                        │  (pivot N:N) │─────────│ created_by_id│
                        └──────────────┘    *    │ last_activity │
                                                 └──────┬───────┘
 ┌──────────┐                                           │1
 │ TypeSalle│1──────*┌────────────┐                     │
 │          │        │   Salle    │            ┌────────▼────────┐
 │ libelle  │        │            │            │TypeProfessionnel│
 │ descript │        │ libelle    │1───────────│     Sante       │
 └──────────┘        │ capacite   │            │                 │
                     │ description│            │ libelle         │
                     │ equipements│            │ description     │
                     └────────────┘            └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOSSIER MÉDICAL                                  │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌──────────────┐         ┌────────────────┐
 │  Patient     │1───────1│ DossierPatient │
 │              │         │                │
 │ nom 🔒       │         │ identifiant    │
 │ prenoms 🔒   │         │ statut         │
 │ date_nais    │         │ groupe_sang 🔒 │
 │ lieu_nais    │         │ notes_import🔒 │
 │ sexe         │         │ nb_consult     │
 │ tel_1        │         │ nb_hospit      │
 │ tel_2        │         │ date_ouverture │
 │ email 🔒     │         │ date_fermeture │
 │ personne_    │         │ date_dern_cons │
 │  prevenir    │         │ structure_id   │
 │ created_by_id│         │ user_id        │
 │ structure_id │         └───────┬────────┘
 └──────────────┘                 │1
                    ┌─────────────┼──────────────────────────────┐
                    │             │                              │
                    │*            │*                             │*
             ┌──────▼──────┐  ┌──────▼──────┐           ┌───────▼──────┐
             │ Antecedent  │  │ Constante   │           │ Consultation │
             │             │  │             │           │              │
             │ libelle 🔒  │  │ poids       │           │ motif_       │
             │ description🔒│ │ taille      │           │  principal 🔒│
             │ type        │  │ imc         │           │ date         │
             │ code_cim    │  │ temperature │           │ observation🔒│
             │ resolution  │  │ tension_sys │           │ histoire_    │
             │ filiation   │  │ tension_dia │           │  maladie_    │
             │ date_       │  │ freq_card   │           │  symptomes🔒 │
             │  evenement  │  │ freq_resp   │           │ conclusion_  │
             │ traitements🔒│ │ sat_O2      │           │  medicale 🔒 │
             │ etat_actuel🔒│ │ glycemie    │           │ conduite_a_  │
             └─────────────┘  └─────────────┘           │  tenir 🔒    │
                                                        │ statut       │
                                                        │ type_suivi   │
                                                        └───────┬──────┘
                                                                │1
      ┌──────────────────────┬──────────────────┬───────────────┼───────┐
      │                      │                  │               │       │
      │*                     │*                 │*              │*      │*
┌─────▼─────┐  ┌─────────────▼───┐  ┌──────────▼──┐  ┌────────▼─┐  ┌─▼──────────────┐
│Diagnostic │  │  Prescription   │  │   Examen    │  │Traitement│  │ExamenClinique  │
│           │  │                 │  │             │  │          │  │                │
│ type      │  │ denomination 🔒 │  │ type        │  │ type     │  │ date_examen    │
│ libelle   │  │ posologie 🔒    │  │ libelle 🔒  │  │ medic 🔒 │  │ observation 🔒 │
│ code_cim  │  │ duree_jours     │  │ indication🔒│  │ dosages🔒│  │ remarques 🔒   │
│ gravite   │  │ type            │  │ resultats🔒 │  │ posolo🔒 │  └────────┬───────┘
│ statut    │  │ date_debut      │  │ date_demande│  │ duree    │           │1
│ type_     │  │ date_fin        │  │ date_examen │  └──────────┘           │*
│ diagnostic│  │ tolerance       │  │ date_recep  │               ┌────────▼──────────┐
│ _id       │  │ statut          │  │ type_examen │               │ExamenClinique     │
└─────┬─────┘  │ urgent          │  │ _id         │               │    Systeme        │
      │        └────────┬────────┘  │ statut      │               │                   │
      │                 │           │ urgent      │               │ systeme           │
      │*                │*          └─────────────┘               │ observations 🔒   │
┌─────▼──────┐  ┌───────▼──────────┐                              │ anomalies 🔒      │
│Type        │  │PrescriptionMedic │                              └───────────────────┘
│Diagnostic  │  │  amenteux        │
│            │  │                  │  ┌───────────────────────┐
│ libelle    │  │ medicament       │  │PrescriptionNon        │
│ description│  │ dosage           │  │  Medicamenteux        │
└────────────┘  │ posologie        │  │                       │
                │ voie_admin       │  │ type                  │
                │ duree            │  │ description           │
                └──────────────────┘  │ duree                 │
                                      │ frequence             │
                                      └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                  MESURES VITALES & ANTHROPOMÉTRIE                          │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────┐         ┌────────────────┐
 │SessionMesureVitale  │1───────*│ MesureVitale   │
 │                     │         │                │
 │ date_session        │         │ type_mesure    │
 │ contexte            │         │ valeur         │
 │ observation         │         │ unite          │
 │ consultation_id     │         │ commentaire    │
 │ dossier_patient_id  │         └────────────────┘
 └─────────────────────┘

 ┌─────────────────────┐
 │  Anthropometrie     │
 │                     │
 │ date_mesure         │
 │ poids               │
 │ taille              │
 │ imc                 │
 │ tour_taille         │
 │ tour_bras           │
 │ perimetre_cranien   │
 │ consultation_id     │
 │ patient_id          │
 └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                 ALLERGIES & HABITUDES DE VIE                               │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────┐         ┌─────────────────────┐
 │     Allergie        │         │  HabitudeDeVie      │
 │                     │         │                     │
 │ type                │         │ type                │
 │ allergene           │         │ description         │
 │ reaction            │         │ frequence           │
 │ severite            │         │ date_debut          │
 │ date_decouverte     │         │ date_fin            │
 │ statut              │         │ statut              │
 │ consultation_id     │         │ consultation_id     │
 │ dossier_patient_id  │         │ dossier_patient_id  │
 └─────────────────────┘         └─────────────────────┘

 ┌─────────────────────────┐
 │AntecedentMedicamenteux  │
 │                         │
 │ medicament              │
 │ indication              │
 │ date_debut              │
 │ date_fin                │
 │ posologie               │
 │ tolerance               │
 │ consultation_id         │
 │ dossier_patient_id      │
 └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      RENDEZ-VOUS & ACTES MÉDICAUX                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐        ┌────────────┐        ┌──────────┐
  │   RendezVous     │*──────*│acte_rdv    │*──────*│   Acte   │
  │                  │ (pivot)│  (pivot)   │        │          │
  │ type             │        └────────────┘        │ libelle  │
  │ motif 🔒         │                              │ cout     │
  │ date             │                              │ description│
  │ heure            │        ┌────────────┐        │ duree    │
  │ priorite         │        │  TypeActe  │        └──────┬───┘
  │ statut           │        │            │               │*
  │ type_resume      │        │ libelle    │1──────────────┘
  │ date_annulation  │        │ description│
  │ room_name        │        └────────────┘
  │ resume 🔒        │
  │ motif_annul 🔒   │        ┌────────────────────┐
  │ dossier_patient  │        │rendez_vous_invite  │
  │ _id              │1──────*│  (pivot N:N→User)  │
  │ type_facturation │        └────────────────────┘
  │ _id              │
  └────────┬─────────┘
           │1
           │*
    ┌──────▼──────┐
    │  Paiement   │        ┌────────────────┐
    │             │*──────1│TypeFacturation │
    │ telephone🔒 │        │                │
    │ montant 🔒  │        │ libelle        │
    │ code_otp 🔒 │        │ description    │
    └─────────────┘        └────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOCUMENTS & ACCÈS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐                  ┌──────────────────┐
  │    Document     │                  │  DossierAcces    │
  │  (polymorphe)   │                  │                  │
  │                 │                  │ niveau_acces     │
  │ titre           │                  │ date_debut_acces │
  │ type            │                  │ date_fin_acces   │
  │ nom_fichier_    │                  │ motif_acces      │
  │   original      │                  │ acces_actif      │
  │ description 🔒  │                  │ motif_revocation │
  │ chemin_fichier  │                  └──────────────────┘
  │ type_mime       │
  │ taille_octets   │
  │ date_document   │
  │ niveau_confid   │
  │ verifie         │
  │ verifie_par_    │
  │   user_id       │
  │ date_           │
  │   verification  │
  └─────────────────┘

  → Document est polymorphe : lié à Consultation, Traitement, Examen, DossierPatient
  → DossierAcces contrôle l'accès au DossierPatient par User (autorisé par un autre User)

  🔒 = Champ chiffré (AES-256)

┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOCALISATION & GÉOGRAPHIE                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐            ┌──────────────────────┐
  │  Localisation    │            │  InformationsBancaire│
  │  (polymorphe)    │            │                      │
  │                  │            │ type                 │
  │ addresse_1       │            │ banque               │
  │ addresse_2       │            └──────────────────────┘
  │ code_postal      │
  │ proprietaire_id  │            ┌──────────────────────┐
  │ proprietaire_type│            │       City           │
  └──────────────────┘            │                      │
                                  │ (référence géo)      │
  → Polymorphe : lié à User,     └──────────────────────┘
    Structure, Administrateur
```

### Cardinalités principales

| Relation                                    | Cardinalité | Description                                         |
| ------------------------------------------- | ----------- | --------------------------------------------------- |
| Patient → DossierPatient                    | 1:1         | Un patient possède un unique dossier                |
| DossierPatient → Consultation               | 1:N         | Un dossier contient plusieurs consultations         |
| DossierPatient → Antecedent                 | 1:N         | Un dossier contient plusieurs antécédents           |
| DossierPatient → Constante                  | 1:N         | Un dossier contient plusieurs mesures de constantes |
| DossierPatient → Allergie                   | 1:N         | Un dossier contient plusieurs allergies             |
| DossierPatient → HabitudeDeVie              | 1:N         | Un dossier contient plusieurs habitudes de vie      |
| DossierPatient → AntecedentMedicamenteux    | 1:N         | Historique médicamenteux du patient                 |
| DossierPatient → SessionMesureVitale        | 1:N         | Sessions de mesures vitales                         |
| DossierPatient → ExamenClinique             | 1:N         | Examens cliniques du patient                        |
| DossierPatient → Document                   | 1:N         | Un dossier contient plusieurs documents             |
| DossierPatient → RendezVous                 | 1:N         | RDV liés au dossier                                 |
| Consultation → Diagnostic                   | 1:N         | Une consultation produit N diagnostics              |
| Consultation → Prescription                 | 1:N         | Une consultation produit N prescriptions            |
| Consultation → Examen                       | 1:N         | Une consultation prescrit N examens                 |
| Consultation → ExamenClinique               | 1:1         | Examen clinique de la consultation                  |
| Consultation → Allergie                     | 1:N         | Allergies découvertes en consultation               |
| Consultation → HabitudeDeVie                | 1:N         | Habitudes relevées en consultation                  |
| Consultation → AntecedentMedicamenteux      | 1:N         | Médicaments relevés en consultation                 |
| Consultation → Anthropometrie               | 1:N         | Mesures anthropométriques en consultation           |
| Consultation → SessionMesureVitale          | 1:N         | Mesures vitales en consultation                     |
| Consultation → Acte                         | 1:N         | Une consultation comporte N actes                   |
| Consultation → Traitement                   | 1:N         | Une consultation produit N traitements              |
| Diagnostic → TypeDiagnostic                 | N:1         | Type de diagnostic (principal, différentiel…)       |
| Diagnostic → Traitement                     | 1:N         | Un diagnostic mène à N traitements                  |
| Examen → TypeExamen                         | N:1         | Type d'examen (biologie, imagerie…)                 |
| Prescription → PrescriptionMedicamenteux    | 1:N         | Détail des prescriptions médicamenteuses            |
| Prescription → PrescriptionNonMedicamenteux | 1:N         | Prescriptions non médicamenteuses                   |
| ExamenClinique → ExamenCliniqueSysteme      | 1:N         | Systèmes examinés (cardio, pulm…)                   |
| SessionMesureVitale → MesureVitale          | 1:N         | Mesures individuelles d'une session                 |
| RendezVous ↔ Acte                           | N:N         | Pivot `acte_rendez_vous`                            |
| RendezVous ↔ User (invités)                 | N:N         | Pivot `rendez_vous_invite`                          |
| RendezVous → Paiement                       | 1:N         | Un RDV peut avoir N paiements                       |
| RendezVous → DossierPatient                 | N:1         | Lié au dossier patient                              |
| RendezVous → TypeFacturation                | N:1         | Type de facturation du RDV                          |
| User → Consultation                         | 1:N         | Un PS réalise N consultations                       |
| User → RendezVous                           | 1:N         | Un PS gère N rendez-vous                            |
| User ↔ Service                              | N:N         | Pivot `service_user`                                |
| User → User (created_by)                    | 1:N         | Chaîne de création hiérarchique                     |
| Structure → TypeStructure                   | N:1         | Type de structure (CHU, CMA, CSPS)                  |
| Structure → Structure (parent)              | 1:N         | Structures hiérarchiques                            |
| Structure → Service                         | 1:N         | Une structure contient N services                   |
| Structure → Salle                           | 1:N         | Une structure contient N salles                     |
| Structure → User                            | 1:N         | Une structure emploie N utilisateurs                |
| Structure → DossierPatient                  | 1:N         | Dossiers rattachés à la structure                   |
| Patient → Structure                         | N:1         | Patient rattaché à une structure                    |
| Patient → User (created_by)                 | N:1         | PS ayant créé le patient                            |
| DossierPatient → DossierAcces               | 1:N         | Contrôle d'accès granulaire                         |

### Nouvelles entités (v2.0.0)

| Entité                       | Table                            | Description                                        |
| ---------------------------- | -------------------------------- | -------------------------------------------------- |
| TypeStructure                | `type_structures`                | Types d'établissements (CHU, CMA, CSPS…)           |
| TypeDiagnostic               | `type_diagnostics`               | Types de diagnostics (principal, différentiel…)    |
| TypeExamen                   | `type_examens`                   | Types d'examens (biologie, imagerie, fonctionnel…) |
| Allergie                     | `allergies`                      | Allergies médicamenteuses, alimentaires, etc.      |
| HabitudeDeVie                | `habitude_de_vies`               | Tabac, alcool, activité physique, etc.             |
| AntecedentMedicamenteux      | `antecedent_medicamenteux`       | Historique des médicaments pris                    |
| ExamenClinique               | `examen_cliniques`               | Examen clinique complet d'une consultation         |
| ExamenCliniqueSysteme        | `examen_clinique_systemes`       | Détail par système (cardio, pulm, neuro…)          |
| SessionMesureVitale          | `session_mesure_vitales`         | Session groupant plusieurs mesures                 |
| MesureVitale                 | `mesure_vitales`                 | Mesure individuelle (TA, FC, SpO2…)                |
| Anthropometrie               | `anthropometries`                | Poids, taille, IMC, périmètres                     |
| PrescriptionMedicamenteux    | `prescription_medicamenteux`     | Détail d'une prescription médicamenteuse           |
| PrescriptionNonMedicamenteux | `prescription_non_medicamenteux` | Kinésithérapie, régime, repos…                     |

### Colonnes renommées (v2.0.0)

| Table           | Ancienne colonne  | Nouvelle colonne  | Raison                                           |
| --------------- | ----------------- | ----------------- | ------------------------------------------------ |
| `consultations` | `motif`           | `motif_principal` | Alignement MCD — distinction motif principal     |
| `diagnostics`   | `intitule`        | `libelle`         | Harmonisation terminologique MCD                 |
| `examens`       | `intitule`        | `libelle`         | Harmonisation terminologique MCD                 |
| `antecedents`   | `intitule`        | `libelle`         | Harmonisation terminologique MCD                 |
| `antecedents`   | `date_diagnostic` | `date_evenement`  | Alignement MCD — couvre plus que les diagnostics |

### Entités polymorphes

| Entité         | Propriétaire possible                            | Champs morphTo                         |
| -------------- | ------------------------------------------------ | -------------------------------------- |
| `Document`     | Consultation, Traitement, Examen, DossierPatient | `documentable_id`, `documentable_type` |
| `Localisation` | User, Structure, Administrateur                  | `proprietaire_id`, `proprietaire_type` |

---

## 6. MVP — Produit Minimum Viable

### Fonctionnalités livrées (état actuel)

#### ✅ Module Authentification & Autorisation

- Connexion OAuth2 (Laravel Passport)
- Système de rôles et permissions (Spatie) — 6 rôles, 26+ permissions
- Gestion des rôles : attribution, révocation
- Gestion des permissions : attribution granulaire par rôle et par utilisateur
- Journalisation des connexions (`last_login_at`, `last_activity_at`)
- Inscription publique réservée aux patients uniquement

#### ✅ Module Workflow Hiérarchique (v2.0.0)

- Admin crée TypeStructures (CHU, CMA, CSPS), Structures, Gestionnaires
- Gestionnaire crée PS (médecins, spécialistes, professionnels de santé)
- Gestionnaire affecte PS aux structures et services
- PS crée patients et les rattache à sa structure
- Traçabilité `created_by_id` sur toutes les entités créées
- Tableau de bord gestionnaire (statistiques structure)

#### ✅ Module Gestion des Patients

- CRUD complet des patients
- Recherche de patients (avec champs chiffrés)
- Création et gestion du dossier médical (DossierPatient)
- Historique médical complet (allergies, habitudes, antécédents médicamenteux)
- Historique des accès au dossier
- Statistiques patients
- Personne à prévenir, lieu de naissance

#### ✅ Module Consultations

- CRUD consultations médicales
- Liaison avec dossier patient, rendez-vous et professionnel de santé
- Gestion des diagnostics (avec codes CIM-10 et types de diagnostic)
- Gestion des prescriptions (médicamenteuses et non médicamenteuses)
- Gestion des examens (prescription, résultats, interprétation, types d'examen)
- Gestion des constantes vitales (poids, taille, IMC, TA, FC, FR, SpO2, glycémie)
- Gestion des traitements
- Gestion des antécédents médicaux (avec code CIM, filiation, résolution)
- Examen clinique par systèmes (cardio, pulmonaire, neuro…)
- Sessions de mesures vitales structurées
- Anthropométrie (poids, taille, IMC, tour de taille, périmètre crânien)
- Allergies et habitudes de vie
- Antécédents médicamenteux
- Histoire de la maladie / symptômes, conclusion médicale, conduite à tenir

#### ✅ Module Rendez-vous

- CRUD rendez-vous
- Types : téléconsultation, présentiel, suivi, urgence
- Workflow : création → confirmation → début consultation → fin → résumé
- Annulation avec motif et date d'annulation
- Vérification de disponibilité
- Notifications (événements + broadcast)
- Historique de paiements par RDV
- Invitations multi-PS (pivot `rendez_vous_invite`)
- Liaison dossier patient et type de facturation
- Statistiques rendez-vous

#### ✅ Module Structures & Organisation

- CRUD structures sanitaires avec types (CHU, CMA, CSPS)
- Hiérarchie de structures (parent/enfants)
- CRUD services médicaux
- CRUD salles de consultation
- Gestion des types (structure, salle, acte, facturation)
- Activation/désactivation de structures et services
- Affectation N:N User ↔ Service (pivot `service_user`)
- Statistiques par structure et service

#### ✅ Module Professionnels de Santé

- CRUD des professionnels de santé
- Gestion des grades et types de PS
- Affectation à une structure et un service
- Consultation de leur planning (rendez-vous, consultations)
- Statistiques

#### ✅ Module Documents

- Upload et stockage chiffré (EncryptedFileService)
- Téléchargement et prévisualisation
- Vérification de documents par un professionnel (`verifie_par_user_id`, `date_verification`)
- Association polymorphe (consultation, traitement, examen, dossier patient)
- Métadonnées : type, nom fichier original, date document

#### ✅ Module Paiement

- Intégration Orange Money (envoi de paiement OTP)
- Gestion des facturations et types de facturation

#### ✅ Module Temps Réel

- WebSocket via Pusher + Laravel Reverb
- Événements broadcast : création de RDV, rappels, changement de statut
- Notifications push

#### ✅ Module Référentiel Géographique

- Import des localités du Burkina Faso (régions, provinces, communes, villages)
- Gestion des pays
- Référentiel de villes

#### ✅ Module Audit & Traçabilité

- Activity Log (Spatie) sur toutes les opérations sensibles
- Contrôle d'accès aux dossiers (DossierAcces)
- Journalisation des connexions

---

## 7. Roadmap

### Phase 1 — Consolidation du MVP _(T2 2026)_

| Priorité   | Fonctionnalité                                       | Statut                                      |
| ---------- | ---------------------------------------------------- | ------------------------------------------- |
| 🔴 Haute   | Tests unitaires et d'intégration complets            | ✅ Fait (287 tests, 664 assertions)         |
| 🔴 Haute   | Validation et nettoyage des Form Requests            | ✅ Fait                                     |
| 🔴 Haute   | Documentation API (Swagger / OpenAPI)                | En cours                                    |
| 🔴 Haute   | Migration de SQLite → MySQL/PostgreSQL en production | ✅ Prêt (config MySQL dans .env.production) |
| 🟡 Moyenne | Optimisation des requêtes N+1 (eager loading)        | ✅ Fait                                     |
| 🟡 Moyenne | Finalisation du module Secrétaire Médical            | ✅ Fait                                     |
| 🟡 Moyenne | CI/CD pipeline (GitHub Actions)                      | ✅ Fait                                     |

### Phase 2 — Téléconsultation avancée _(T3 2026)_

| Priorité   | Fonctionnalité                                             | Statut                                  |
| ---------- | ---------------------------------------------------------- | --------------------------------------- |
| 🔴 Haute   | Intégration complète Google Meet (création auto de salles) | ✅ Fait                                 |
| 🔴 Haute   | WebSocket temps réel (Laravel Reverb)                      | ✅ Fait                                 |
| 🟡 Moyenne | Chat en temps réel médecin-patient                         | ✅ Fait (WebSocket + MessageController) |
| 🟡 Moyenne | Partage d'écran et annotation de documents                 | À faire                                 |
| 🟢 Basse   | Enregistrement des consultations vidéo                     | À faire                                 |

### Phase 3 — Gestion financière complète _(T4 2026)_

| Priorité   | Fonctionnalité                                          | Statut  |
| ---------- | ------------------------------------------------------- | ------- |
| 🔴 Haute   | Module facturation complet (devis, factures, reçus)     | À faire |
| 🔴 Haute   | Intégration multi-paiement (Moov Money, carte bancaire) | À faire |
| 🟡 Moyenne | Tableau de bord financier et rapports                   | À faire |
| 🟡 Moyenne | Gestion des assurances et mutuelles                     | À faire |
| 🟢 Basse   | Export comptable                                        | À faire |

### Phase 4 — Intelligence & Reporting _(T1 2027)_

| Priorité   | Fonctionnalité                                       | Statut  |
| ---------- | ---------------------------------------------------- | ------- |
| 🔴 Haute   | Tableau de bord analytique (KPIs santé)              | À faire |
| 🟡 Moyenne | Reporting épidémiologique (agrégation anonymisée)    | À faire |
| 🟡 Moyenne | Export de données (PDF, Excel)                       | À faire |
| 🟡 Moyenne | Alertes médicales automatiques (résultats critiques) | À faire |
| 🟢 Basse   | IA d'aide au diagnostic (suggestion CIM-10)          | À faire |

### Phase 5 — Application Mobile _(T2 2027)_

| Priorité   | Fonctionnalité                                      | Statut  |
| ---------- | --------------------------------------------------- | ------- |
| 🔴 Haute   | Application mobile patient (Flutter / React Native) | À faire |
| 🟡 Moyenne | Application mobile professionnel de santé           | À faire |
| 🟡 Moyenne | Notifications push mobile                           | À faire |
| 🟢 Basse   | Mode hors connexion (sync différée)                 | À faire |

### Phase 6 — Interopérabilité _(T3-T4 2027)_

| Priorité   | Fonctionnalité                               | Statut   |
| ---------- | -------------------------------------------- | -------- |
| 🔴 Haute   | Standard HL7 FHIR R4 (14 ressources)         | ✅ Fait  |
| 🔴 Haute   | HL7 CDA R2 / C-CDA 2.1 (documents cliniques) | ✅ Fait  |
| 🔴 Haute   | SNOMED CT (350K+ concepts via Snowstorm)     | ✅ Fait  |
| 🔴 Haute   | ICD-11 / CIM-11 (OMS, search/crosswalk)      | ✅ Fait  |
| 🔴 Haute   | ATC (classification médicaments, offline)    | ✅ Fait  |
| 🔴 Haute   | DICOM / DICOMweb (dcm4chee PACS)             | ✅ Fait  |
| 🟡 Moyenne | Intégration DHIS2 (push indicateurs agrégés) | ✅ Fait  |
| 🟡 Moyenne | Intégration ENDOS Burkina Faso               | ✅ Fait  |
| 🟡 Moyenne | API publique documentée pour partenaires     | En cours |
| 🟢 Basse   | Connecteur pharmacie / laboratoire           | À faire  |

### 7b. Roadmap par acteur système

Vue transversale de la roadmap, ventilée par rôle utilisateur.

#### 🔴 Administrateur Système (`admin`)

| Phase | Fonctionnalité                                         | Échéance   | Statut   |
| ----- | ------------------------------------------------------ | ---------- | -------- |
| 1     | Gestion types de structures, structures, gestionnaires | T2 2026    | ✅ Fait  |
| 1     | Tests unitaires et d'intégration (287 tests)           | T2 2026    | ✅ Fait  |
| 1     | CI/CD pipeline (GitHub Actions)                        | T2 2026    | ✅ Fait  |
| 1     | Documentation API (Swagger / OpenAPI)                  | T2 2026    | En cours |
| 3     | Tableau de bord financier global et rapports           | T4 2026    | À faire  |
| 3     | Export comptable                                       | T4 2026    | À faire  |
| 4     | Tableau de bord analytique (KPIs santé globaux)        | T1 2027    | À faire  |
| 4     | Reporting épidémiologique (agrégation anonymisée)      | T1 2027    | À faire  |
| 4     | Export de données (PDF, Excel)                         | T1 2027    | À faire  |
| 6     | API publique documentée pour partenaires               | T3-T4 2027 | En cours |
| 6     | Intégration DHIS2 / ENDOS (push indicateurs)           | T3-T4 2027 | ✅ Fait  |

#### 🟠 Gestionnaire de Structure (`structure_manager`)

| Phase | Fonctionnalité                                        | Échéance | Statut  |
| ----- | ----------------------------------------------------- | -------- | ------- |
| 1     | Création PS, affectation structures/services          | T2 2026  | ✅ Fait |
| 1     | Tableau de bord structure (statistiques)              | T2 2026  | ✅ Fait |
| 1     | Finalisation module Secrétaire Médical                | T2 2026  | ✅ Fait |
| 3     | Module facturation structure (devis, factures, reçus) | T4 2026  | À faire |
| 3     | Gestion des assurances et mutuelles                   | T4 2026  | À faire |
| 4     | KPIs santé par structure                              | T1 2027  | À faire |
| 4     | Rapports et exports par structure (PDF, Excel)        | T1 2027  | À faire |
| 5     | Application mobile gestionnaire / PS                  | T2 2027  | À faire |

#### 🔵 Médecin (`doctor`) & Spécialiste (`specialist`)

| Phase | Fonctionnalité                                                       | Échéance   | Statut  |
| ----- | -------------------------------------------------------------------- | ---------- | ------- |
| 1     | CRUD consultations, diagnostics, prescriptions, examens, traitements | T2 2026    | ✅ Fait |
| 1     | Examen clinique par systèmes, mesures vitales, anthropométrie        | T2 2026    | ✅ Fait |
| 1     | Gestion antécédents, allergies, habitudes de vie                     | T2 2026    | ✅ Fait |
| 2     | Intégration Google Meet (création auto salles)                       | T3 2026    | ✅ Fait |
| 2     | Chat temps réel médecin-patient (WebSocket)                          | T3 2026    | ✅ Fait |
| 2     | Partage d'écran et annotation de documents                           | T3 2026    | À faire |
| 2     | Enregistrement des consultations vidéo                               | T3 2026    | À faire |
| 4     | Alertes médicales automatiques (résultats critiques)                 | T1 2027    | À faire |
| 4     | IA d'aide au diagnostic (suggestion CIM-10)                          | T1 2027    | À faire |
| 5     | Application mobile professionnel de santé                            | T2 2027    | À faire |
| 5     | Notifications push mobile                                            | T2 2027    | À faire |
| 6     | HL7 FHIR R4 (14 ressources)                                          | T3-T4 2027 | ✅ Fait |
| 6     | HL7 CDA R2 / C-CDA 2.1 (documents cliniques)                         | T3-T4 2027 | ✅ Fait |
| 6     | SNOMED CT / ICD-11 / ATC (terminologies)                             | T3-T4 2027 | ✅ Fait |
| 6     | DICOM / DICOMweb (imagerie médicale)                                 | T3-T4 2027 | ✅ Fait |
| 6     | Connecteur pharmacie / laboratoire                                   | T3-T4 2027 | À faire |

#### 🟢 Professionnel de Santé (`health_professional`)

| Phase | Fonctionnalité                                                 | Échéance   | Statut  |
| ----- | -------------------------------------------------------------- | ---------- | ------- |
| 1     | Création patients, rattachement structure                      | T2 2026    | ✅ Fait |
| 1     | Gestion dossiers médicaux (constantes, antécédents, allergies) | T2 2026    | ✅ Fait |
| 1     | Upload et stockage chiffré de documents                        | T2 2026    | ✅ Fait |
| 2     | Chat temps réel avec médecins et patients                      | T3 2026    | ✅ Fait |
| 3     | Facturation et gestion paiements                               | T4 2026    | À faire |
| 5     | Application mobile professionnel de santé                      | T2 2027    | À faire |
| 5     | Notifications push mobile                                      | T2 2027    | À faire |
| 6     | Accès terminologies (SNOMED CT, ICD-11, ATC)                   | T3-T4 2027 | ✅ Fait |

#### 🟣 Patient (`patient`)

| Phase | Fonctionnalité                                       | Échéance | Statut  |
| ----- | ---------------------------------------------------- | -------- | ------- |
| 1     | Inscription autonome (rôle patient)                  | T2 2026  | ✅ Fait |
| 1     | Consultation de son dossier médical                  | T2 2026  | ✅ Fait |
| 1     | Prise de rendez-vous (présentiel & téléconsultation) | T2 2026  | ✅ Fait |
| 1     | Paiement Orange Money (OTP)                          | T2 2026  | ✅ Fait |
| 2     | Téléconsultation vidéo (Google Meet)                 | T3 2026  | ✅ Fait |
| 2     | Chat temps réel avec son médecin                     | T3 2026  | ✅ Fait |
| 2     | Notifications temps réel (WebSocket)                 | T3 2026  | ✅ Fait |
| 3     | Multi-paiement (Moov Money, carte bancaire)          | T4 2026  | À faire |
| 3     | Gestion assurances et mutuelles                      | T4 2026  | À faire |
| 4     | Consultation résultats d'examens en ligne            | T1 2027  | À faire |
| 4     | Alertes automatiques (résultats critiques)           | T1 2027  | À faire |
| 5     | Application mobile patient (Flutter / React Native)  | T2 2027  | À faire |
| 5     | Notifications push mobile                            | T2 2027  | À faire |
| 5     | Mode hors connexion (sync différée)                  | T2 2027  | À faire |

#### Synthèse par acteur

```
                         T2 2026    T3 2026    T4 2026    T1 2027    T2 2027    T3-T4 2027
                         Phase 1    Phase 2    Phase 3    Phase 4    Phase 5    Phase 6
                        ─────────  ─────────  ─────────  ─────────  ─────────  ──────────
 Admin                  ███████░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░
 Gestionnaire           ███████░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░
 Médecin/Spécialiste    ███████░░  ████░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░
 Prof. de Santé         ███████░░  ████░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░
 Patient                ███████░░  ████░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░  ░░░░░░░░░

 ██ = Livré    ░░ = À venir
```

---

## 8. API — Routes principales (96 routes)

### Authentification

| Méthode | Endpoint        | Description                           |
| ------- | --------------- | ------------------------------------- |
| POST    | `/api/login`    | Connexion (retourne token OAuth2)     |
| POST    | `/api/register` | Inscription (rôle patient uniquement) |
| POST    | `/api/logout`   | Déconnexion                           |

### Administration _(auth:api, role:admin)_

| Méthode | Endpoint                                      | Description                   |
| ------- | --------------------------------------------- | ----------------------------- |
| GET     | `/api/admin/type-structures`                  | Liste des types de structures |
| POST    | `/api/admin/type-structures`                  | Création type de structure    |
| PUT     | `/api/admin/type-structures/{id}`             | Mise à jour type              |
| DELETE  | `/api/admin/type-structures/{id}`             | Suppression type              |
| GET     | `/api/admin/structures`                       | Liste des structures          |
| POST    | `/api/admin/structures`                       | Création structure            |
| PUT     | `/api/admin/structures/{id}`                  | Mise à jour structure         |
| DELETE  | `/api/admin/structures/{id}`                  | Suppression structure         |
| GET     | `/api/admin/gestionnaires`                    | Liste des gestionnaires       |
| POST    | `/api/admin/gestionnaires`                    | Création gestionnaire         |
| PUT     | `/api/admin/gestionnaires/{id}`               | Mise à jour gestionnaire      |
| PATCH   | `/api/admin/gestionnaires/{id}/toggle-status` | Activer/désactiver            |

### Gestionnaire _(auth:api, role:structure_manager)_

| Méthode | Endpoint                                              | Description               |
| ------- | ----------------------------------------------------- | ------------------------- |
| GET     | `/api/gestionnaire/dashboard`                         | Tableau de bord structure |
| GET     | `/api/gestionnaire/professionnels`                    | Liste PS de la structure  |
| POST    | `/api/gestionnaire/professionnels`                    | Création PS               |
| GET     | `/api/gestionnaire/professionnels/{id}`               | Détail PS                 |
| PUT     | `/api/gestionnaire/professionnels/{id}`               | Mise à jour PS            |
| PATCH   | `/api/gestionnaire/professionnels/{id}/toggle-status` | Activer/désactiver PS     |
| GET     | `/api/gestionnaire/services`                          | Services de la structure  |

### Patients _(auth:api)_

| Méthode | Endpoint                                | Description                                         |
| ------- | --------------------------------------- | --------------------------------------------------- |
| GET     | `/api/patients`                         | Liste paginée                                       |
| POST    | `/api/patients`                         | Création (auto-set `created_by_id`, `structure_id`) |
| GET     | `/api/patients/{id}`                    | Détail                                              |
| PUT     | `/api/patients/{id}`                    | Mise à jour                                         |
| DELETE  | `/api/patients/{id}`                    | Suppression (soft delete)                           |
| GET     | `/api/patients-search`                  | Recherche                                           |
| GET     | `/api/patients-statistics`              | Statistiques                                        |
| GET     | `/api/patients/{id}/historique-medical` | Historique médical                                  |

### Rendez-vous _(auth:api)_

| Méthode | Endpoint                                           | Description            |
| ------- | -------------------------------------------------- | ---------------------- |
| GET     | `/api/rendez-vous`                                 | Liste                  |
| POST    | `/api/rendez-vous`                                 | Création               |
| POST    | `/api/rendez-vous/{id}/confirm`                    | Confirmation           |
| POST    | `/api/rendez-vous/{id}/cancel`                     | Annulation             |
| POST    | `/api/rendez-vous/{id}/start`                      | Début consultation     |
| POST    | `/api/rendez-vous/{id}/end`                        | Fin consultation       |
| POST    | `/api/rendez-vous/rendez-vous-check-disponibilite` | Vérifier disponibilité |

### Dossiers médicaux _(auth:api)_

| Méthode | Endpoint                              | Description                                              |
| ------- | ------------------------------------- | -------------------------------------------------------- |
| GET     | `/api/patients/{id}/record`           | Dossier médical complet (eager-load toutes sous-entités) |
| PUT     | `/api/patients/{id}/record`           | Mise à jour dossier (groupe sanguin, notes)              |
| POST    | `/api/antecedents`                    | Création antécédent                                      |
| PUT     | `/api/antecedents/{id}`               | Mise à jour antécédent                                   |
| DELETE  | `/api/antecedents/{id}`               | Suppression antécédent                                   |
| POST    | `/api/allergies`                      | Création allergie                                        |
| PUT     | `/api/allergies/{id}`                 | Mise à jour allergie                                     |
| DELETE  | `/api/allergies/{id}`                 | Suppression allergie                                     |
| POST    | `/api/diagnostics`                    | Création diagnostic                                      |
| PUT     | `/api/diagnostics/{id}`               | Mise à jour diagnostic                                   |
| DELETE  | `/api/diagnostics/{id}`               | Suppression diagnostic                                   |
| POST    | `/api/examens`                        | Création examen                                          |
| PUT     | `/api/examens/{id}`                   | Mise à jour examen                                       |
| DELETE  | `/api/examens/{id}`                   | Suppression examen                                       |
| POST    | `/api/traitements`                    | Création traitement                                      |
| PUT     | `/api/traitements/{id}`               | Mise à jour traitement                                   |
| DELETE  | `/api/traitements/{id}`               | Suppression traitement                                   |
| POST    | `/api/habitudes-de-vie`               | Création habitude de vie                                 |
| PUT     | `/api/habitudes-de-vie/{id}`          | Mise à jour habitude de vie                              |
| DELETE  | `/api/habitudes-de-vie/{id}`          | Suppression habitude de vie                              |
| GET     | `/api/constantes/dossier/{dossierId}` | Constantes par dossier                                   |
| CRUD    | `/api/consultations`                  | Consultations                                            |
| CRUD    | `/api/prescriptions`                  | Prescriptions                                            |
| CRUD    | `/api/documents`                      | Documents médicaux                                       |

### Organisation _(auth:api)_

| Méthode | Endpoint                    | Description             |
| ------- | --------------------------- | ----------------------- |
| CRUD    | `/api/structures`           | Structures sanitaires   |
| CRUD    | `/api/services`             | Services médicaux       |
| CRUD    | `/api/salles`               | Salles de consultation  |
| CRUD    | `/api/professionnels-sante` | Professionnels de santé |

### RBAC _(auth:api)_

| Méthode | Endpoint                | Description             |
| ------- | ----------------------- | ----------------------- |
| CRUD    | `/api/roles`            | Gestion des rôles       |
| CRUD    | `/api/permissions`      | Gestion des permissions |
| POST    | `/api/users/{id}/roles` | Attribution de rôle     |

### Paiement

| Méthode | Endpoint                | Description           |
| ------- | ----------------------- | --------------------- |
| POST    | `/api/orange-money/pay` | Paiement Orange Money |

### Référentiel _(public)_

| Méthode | Endpoint         | Description               |
| ------- | ---------------- | ------------------------- |
| GET     | `/api/localites` | Localités du Burkina Faso |
| GET     | `/api/pays`      | Liste des pays            |

---

## 8b. Dossier médical — Architecture CRUD (Phase 1 & 2)

> **Implémenté le :** Janvier 2026 — Phase 1 (Backend API) + Phase 2 (Frontend enrichi)

### Backend — Couverture

| Entité                  | Modèle | Resource                           | Request                      | Controller                                  | Routes            |
| ----------------------- | ------ | ---------------------------------- | ---------------------------- | ------------------------------------------- | ----------------- |
| DossierPatient          | ✅     | ✅ enrichi                         | —                            | PatientController (getRecord, updateRecord) | GET, PUT          |
| Antécédent              | ✅     | ✅ AntecedentResource              | ✅ StoreAntecedentRequest    | ✅ AntecedentController                     | POST, PUT, DELETE |
| Allergie                | ✅     | ✅ AllergieResource                | ✅ StoreAllergieRequest      | ✅ AllergieController                       | POST, PUT, DELETE |
| Diagnostic              | ✅     | ✅ DiagnosticResource              | ✅ StoreDiagnosticRequest    | ✅ DiagnosticController                     | POST, PUT, DELETE |
| Examen                  | ✅     | ✅ ExamenResource                  | ✅ StoreExamenRequest        | ✅ ExamenController                         | POST, PUT, DELETE |
| Traitement              | ✅     | ✅ TraitementResource              | ✅ StoreTraitementRequest    | ✅ TraitementController                     | POST, PUT, DELETE |
| HabitudeDeVie           | ✅     | ✅ HabitudeDeVieResource           | ✅ StoreHabitudeDeVieRequest | ✅ HabitudeDeVieController                  | POST, PUT, DELETE |
| Constante               | ✅     | ✅ ConstanteResource               | —                            | ✅ ConstanteController                      | GET (by dossier)  |
| AntecedentMedicamenteux | ✅     | ✅ AntecedentMedicamenteuxResource | —                            | —                                           | via eager-load    |
| Prescription            | ✅     | ✅ PrescriptionResource            | ✅ existant                  | ✅ existant                                 | CRUD existant     |

### Frontend — PatientRecord.jsx

| Onglet         | Données affichées                                                              | CRUD Modal                                 |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| Vue d'ensemble | StatCards, notes, allergies à risque, constantes récentes, antécédents récents | —                                          |
| Antécédents    | Liste + type badges + antécédents médicamenteux + habitudes de vie             | ✅ Ajouter antécédent, ✅ Ajouter habitude |
| Allergies      | Liste avec sévérité colorée                                                    | ✅ Ajouter allergie                        |
| Constantes     | Historique complet (poids, taille, IMC, T°, TA, FC, FR, SpO₂, glycémie)        | —                                          |
| Consultations  | Liste cliquable → détail, diagnostics inline                                   | —                                          |
| Prescriptions  | Nom, posologie, durée, statut, urgence, signature                              | —                                          |
| Diagnostics    | Titre, CIM-10, gravité, statut (présumé/confirmé/infirmé)                      | —                                          |
| Examens        | Titre, indication, résultats, statut, urgence                                  | —                                          |

---

## 12. Interopérabilité

TLM-BFA implémente **8 standards** d'interopérabilité santé, tous opérationnels :

| Standard               | Type                              | Statut   | Routes API                       |
| ---------------------- | --------------------------------- | -------- | -------------------------------- |
| HL7 FHIR R4            | Échange données (REST/JSON)       | ✅ Actif | `/api/v1/fhir/*` (14 ressources) |
| HL7 CDA R2 / C-CDA 2.1 | Documents cliniques (XML)         | ✅ Actif | `/api/v1/cda/*`                  |
| SNOMED CT              | Terminologie clinique (Snowstorm) | ✅ Actif | `/api/v1/terminology/snomed/*`   |
| ICD-11 / CIM-11        | Classification OMS                | ✅ Actif | `/api/v1/icd11/*`                |
| ATC                    | Classification médicaments        | ✅ Actif | `/api/v1/terminology/atc/*`      |
| DICOM / DICOMweb       | Imagerie médicale (dcm4chee)      | ✅ Actif | `/api/v1/dicom/*`                |
| DHIS2                  | Indicateurs agrégés (OMS)         | ✅ Actif | `/api/v1/dhis2/*`                |
| ENDOS                  | Entrepôt national BFA (DHIS2)     | ✅ Actif | `/api/v1/dhis2/endos/*`          |

### DHIS2 / ENDOS — Flux de données

```text
TLM-BFA (collecte indicateurs mensuels)
    ↓ Dhis2Service::collectTlmIndicators()
    ↓ buildTlmDataValues() → mapping UIDs
    ↓ POST /api/2.40/dataValueSets
    ├──→ DHIS2 (dhis2.sante.gov.bf)
    └──→ ENDOS (endos.sante.gov.bf)
```

**Indicateurs poussés :** total_consultations, completed_consultations, completion_rate, no_show_rate, total_teleexpertise, teleexpertise_response_rate, e_prescriptions, patients_seen, structures_count

**Commande artisan :** `php artisan dhis2:push-data --period=YYYYMM --target=both`

---

## 13. Temps réel (WebSocket)

Architecture WebSocket basée sur **Laravel Reverb** (serveur WS natif) :

| Composant      | Technologie              | Rôle                         |
| -------------- | ------------------------ | ---------------------------- |
| Serveur        | Laravel Reverb v1.9      | WebSocket server (port 8080) |
| Protocole      | Pusher Protocol          | Compatible pusher-js         |
| Backend Events | 5 broadcastable events   | ShouldBroadcast              |
| Frontend       | laravel-echo + pusher-js | Connexion client             |

### Événements temps réel

| Événement               | Canal                          | Déclencheur          |
| ----------------------- | ------------------------------ | -------------------- |
| `appointment.confirmed` | `private-patient.{id}`         | Confirmation RDV     |
| `consultation.started`  | `private-consultation.{id}`    | Début consultation   |
| `consultation.ended`    | `private-consultation.{id}`    | Fin consultation     |
| `prescription.signed`   | `private-patient.{id}`         | Signature ordonnance |
| `message.new`           | `private-chat.{user1}.{user2}` | Nouveau message      |

### Hooks React

- `useWebSocket()` — Notifications globales (toasts automatiques)
- `useConsultationChannel(id)` — Canal consultation spécifique
- `useChatChannel(otherUserId, onMessage)` — Canal chat privé

---

## 14. CI/CD & Déploiement Hostinger

### Pipeline GitHub Actions

Le pipeline CI/CD exécute automatiquement :

1. **Tests backend** (PHPUnit 287 tests) sur push/PR vers `main`
2. **Build frontend** (Vite production)
3. **Déploiement** via SSH sur Hostinger Cloud

### Déploiement manuel

```bash
bash deploy.sh

# Variante Hostinger / frontend séparé
FRONTEND_BUILD_MODE=production.hostinger bash deploy.sh
```

### Couple Hostinger actuellement branché

- Frontend : `https://aqua-weasel-241472.hostingersite.com`
- API : `https://ivory-tarsier-376970.hostingersite.com/api/v1`
- `Frontend/.env.production.hostinger` pointe déjà vers cette API
- `Backend/.env.production.hostinger` autorise déjà cette origine frontend en CORS
- `deploy.sh` copie automatiquement `Backend/.env.production.hostinger` quand `FRONTEND_BUILD_MODE=production.hostinger`

### Checklist pré-production

- [ ] `APP_DEBUG=false` dans `.env`
- [ ] `APP_URL=https://votre-domaine.com`
- [ ] Base MySQL configurée (`DB_CONNECTION=mysql`)
- [ ] `CACHE_STORE=file` (ou `redis` si disponible)
- [ ] `SESSION_DRIVER=file` (ou `redis`)
- [ ] `LOG_LEVEL=warning`, `LOG_STACK=daily`
- [ ] Clés Passport générées (`php artisan passport:keys`)
- [ ] SSL activé (Let's Encrypt via Hostinger)
- [ ] DocumentRoot → `Backend/public/`
- [ ] Cron pour le scheduler : `* * * * * php artisan schedule:run`
- [ ] `CORS_ALLOWED_ORIGINS` contient uniquement les domaines frontend prod exacts, ou le wildcard `https://*.hostingersite.com` pour les previews Hostinger
- [ ] Frontend build avec `Frontend/.env.production` ou `Frontend/.env.production.hostinger` via `FRONTEND_BUILD_MODE=production.hostinger`
- [ ] `Frontend/public/app-config.runtime.js` n'est plus édité à la main : il est généré pendant le build

### Validation CORS/Login (Hostinger)

Apres modification des variables d'environnement backend:

```bash
cd Backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
```

Test preflight CORS (doit retourner `Access-Control-Allow-Origin` avec votre domaine frontend):

```bash
curl -i -X OPTIONS "https://api.votre-domaine.tld/api/v1/auth/login" \
  -H "Origin: https://votre-domaine.tld" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

Test endpoint login (doit repondre JSON, pas HTML):

```bash
curl -i -X POST "https://api.votre-domaine.tld/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"utilisateur@example.com","password":"motdepasse"}'
```

### API Frontend Services (api/index.js)

```javascript
antecedentsApi     { create, update, delete }
allergiesApi       { create, update, delete }
diagnosticsApi     { create, update, delete }
examensApi         { create, update, delete }
traitementsApi     { create, update, delete }
habitudesDeVieApi  { create, update, delete }
constantesApi      { listByDossier(dossierId) }
patientRecordApi   { get, update, verifyIdentity, archive, recordConsent }
```

---

## 9. Sécurité & conformité

### Chiffrement des données sensibles

Tous les champs médicaux et personnels sensibles sont chiffrés au repos (AES-256) :

- **Patient** : `nom`, `prenoms`, `email`
- **DossierPatient** : `groupe_sanguin`, `notes_importantes`
- **Consultation** : `motif_principal`, `observation`, `histoire_maladie_symptomes`, `conclusion_medicale`, `conduite_a_tenir`
- **Diagnostic** : `description`
- **Prescription** : `denomination`, `posologie`, `instructions`
- **Examen** : `libelle`, `indication`, `resultats`, `commentaire`
- **Constante** : `libelle`, `contexte`
- **Antecedent** : `libelle`, `description`, `traitements`, `etat_actuel`
- **Traitement** : `medicaments`, `dosages`, `posologies`
- **Paiement** : `telephone`, `montant`, `code_otp`
- **RendezVous** : `motif`, `resume`, `motif_annulation`
- **Document** : `description`
- **ExamenClinique** : `observation`, `remarques`
- **ExamenCliniqueSysteme** : `observations`, `anomalies`

### Contrôle d'accès

- OAuth2 (Laravel Passport) pour l'authentification API
- RBAC granulaire (Spatie Permission) — rôles et permissions
- Contrôle d'accès aux dossiers patients (`DossierAcces`)
- Journalisation de tous les accès et modifications (Activity Log)

### Fichiers médicaux

- Stockage chiffré via `EncryptedFileService`
- Vérification et validation des documents par un professionnel

---

## 10. Dépendances

### PHP (Composer)

| Package                      | Version | Usage                      |
| ---------------------------- | ------- | -------------------------- |
| `laravel/framework`          | ^11.9   | Framework principal        |
| `laravel/passport`           | ^13.7   | Authentification OAuth2    |
| `spatie/laravel-permission`  | ^6.25   | RBAC (rôles & permissions) |
| `spatie/laravel-activitylog` | ^4.12   | Audit & traçabilité        |
| `twilio/sdk`                 | ^8.3    | Envoi de SMS               |
| `google/apiclient`           | ^2.18   | Google Meet API            |
| `pusher/pusher-php-server`   | ^7.2    | Temps réel (WebSocket)     |
| `laravel/reverb`             | ^1.0    | Serveur WebSocket natif    |

### JavaScript (NPM)

| Package        | Version | Usage            |
| -------------- | ------- | ---------------- |
| `laravel-echo` | ^2.2.6  | Client WebSocket |
| `pusher-js`    | ^8.4.0  | Client Pusher    |
| `bootstrap`    | ^5.2.3  | Framework CSS    |
| `tailwindcss`  | ^3.4.13 | Utilitaires CSS  |
| `vite`         | ^5.0    | Bundler frontend |

---

## 11. Installation & déploiement

### Prérequis

- PHP 8.3+
- Composer 2.x
- Node.js 18+ & NPM
- MySQL 8.x (ou SQLite pour développement)
- Extensions PHP : `pdo`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`

### Installation locale

```bash
# 1. Cloner le dépôt
git clone <repository-url>
cd Backend

# 2. Installer les dépendances PHP
composer install

# 3. Installer les dépendances JS
npm install

# 4. Copier et configurer l'environnement
cp .env.example .env
php artisan key:generate

# 5. Configurer la base de données dans .env
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=bfa_tlm_data
# DB_USERNAME=root
# DB_PASSWORD=

# 6. Exécuter les migrations
php artisan migrate

# 7. Installer Passport
php artisan passport:install

# 8. Importer les localités (optionnel)
php artisan db:seed

# 9. Compiler les assets frontend
npm run build

# 10. Lancer le serveur
php artisan serve
```

### Variables d'environnement clés

| Variable                                    | Description                                  |
| ------------------------------------------- | -------------------------------------------- |
| `APP_KEY`                                   | Clé de chiffrement (générée automatiquement) |
| `DB_CONNECTION`                             | Driver BDD (`mysql`, `sqlite`, `pgsql`)      |
| `PASSPORT_*`                                | Configuration OAuth2                         |
| `PUSHER_*`                                  | Clés Pusher pour le temps réel               |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | SMS Twilio                                   |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  | Google Meet                                  |
| `ORANGE_MONEY_*`                            | Paiement mobile                              |

---

_Document généré le 25 mars 2026 — TLM_APP-BFA v2.0.0_
