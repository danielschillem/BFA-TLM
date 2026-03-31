# Activation Interop Prod

Date: 2026-03-30
Projet: TLM_APP_BFA

## 1) Objectif
Ce document centralise toutes les commandes necessaires pour activer et verifier l'interoperabilite en production:
- CORS + Auth
- ICD-11 OMS
- HL7 FHIR R4
- HL7 CDA R2
- SNOMED CT / ATC
- DICOM / DICOMweb
- DHIS2 / ENDOS

## 2) Variables obligatoires (Backend/.env)
Verifier et renseigner les variables suivantes:

APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.votre-domaine.tld
FRONTEND_URL=https://votre-domaine.tld
CORS_ALLOWED_ORIGINS=https://votre-domaine.tld,https://www.votre-domaine.tld
SESSION_DOMAIN=.votre-domaine.tld
SESSION_SECURE_COOKIE=true

Note:
- Si vous deployez le frontend et l'API sur le meme host avec `deploy.sh` et `nginx.conf`, utilisez plutot `APP_URL=https://votre-domaine.tld` et gardez `VITE_API_URL=/api/v1`.
- Si l'API reste sur `api.votre-domaine.tld`, `VITE_API_URL` doit etre une URL absolue vers cette API si aucun proxy HTTP ne reecrit `/api/v1`.

ICD11_CLIENT_ID=__A_DEFINIR__
ICD11_CLIENT_SECRET=__A_DEFINIR__
ICD11_TOKEN_ENDPOINT=https://icdaccessmanagement.who.int/connect/token
ICD11_API_BASE_URL=https://id.who.int
ICD11_API_VERSION=v2
ICD11_RELEASE_ID=2024-01
ICD11_LANGUAGE=fr
ICD11_LINEARIZATION=mms

SNOMED_BASE_URL=https://browser.ihtsdotools.org/snowstorm/snomed-ct
SNOMED_BRANCH=MAIN/2024-09-01

DCM4CHEE_BASE_URL=__A_DEFINIR__
DCM4CHEE_WADO_RS=/aets/DCM4CHEE/rs
DCM4CHEE_QIDO_RS=/aets/DCM4CHEE/rs
DCM4CHEE_STOW_RS=/aets/DCM4CHEE/rs

DHIS2_BASE_URL=__A_DEFINIR__
DHIS2_USERNAME=__A_DEFINIR__
DHIS2_PASSWORD=__A_DEFINIR__
DHIS2_DATASET_UID=__A_DEFINIR__
DHIS2_DE_TOTAL_CONSULTATIONS=__A_DEFINIR__
DHIS2_DE_COMPLETED_CONSULTATIONS=__A_DEFINIR__
DHIS2_DE_COMPLETION_RATE=__A_DEFINIR__
DHIS2_DE_NO_SHOW_RATE=__A_DEFINIR__
DHIS2_DE_TOTAL_TELEEXPERTISE=__A_DEFINIR__
DHIS2_DE_TELEEX_RESPONSE_RATE=__A_DEFINIR__
DHIS2_DE_E_PRESCRIPTIONS=__A_DEFINIR__
DHIS2_DE_PATIENTS_SEEN=__A_DEFINIR__
DHIS2_DE_STRUCTURES_COUNT=__A_DEFINIR__

ENDOS_ENABLED=false
ENDOS_BASE_URL=__A_DEFINIR__
ENDOS_USERNAME=__A_DEFINIR__
ENDOS_PASSWORD=__A_DEFINIR__
ENDOS_DATASET_UID=__A_DEFINIR__
ENDOS_ORG_UNIT_ROOT=__A_DEFINIR__
ENDOS_ORG_UNIT_MAPPING=__A_DEFINIR__

## 3) Recharger la config Laravel apres MAJ .env
Executer sur le serveur:

cd /var/www/liptakocare/Backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache

## 4) Build frontend en mode production

cd /var/www/liptakocare/Frontend
npm ci
npx vite build --mode production

Verifier Frontend/.env.production:

VITE_API_URL=/api/v1
VITE_USE_MOCKS=false

Si l'API est sur un sous-domaine separe sans proxy sur le frontend:

VITE_API_URL=https://api.votre-domaine.tld/api/v1
VITE_USE_MOCKS=false

## 5) Variables shell pour les tests

export DOMAIN_API="api.votre-domaine.tld"
export DOMAIN_FRONT="votre-domaine.tld"
export ADMIN_EMAIL="admin@votre-domaine.tld"
export ADMIN_PASSWORD="__A_DEFINIR__"

## 6) Test CORS preflight login

curl -i -X OPTIONS "https://$DOMAIN_API/api/v1/auth/login" \
  -H "Origin: https://$DOMAIN_FRONT" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"

Attendu:
- HTTP 200 ou 204
- Access-Control-Allow-Origin present avec le domaine frontend

## 7) Test login JSON

curl -i -X POST "https://$DOMAIN_API/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"

Attendu:
- HTTP 200
- token ou access_token renvoye

## 8) Recuperer un token pour les tests proteges

TOKEN=$(curl -s -X POST "https://$DOMAIN_API/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | grep -oE '"(token|access_token)":"[^"]+"' | head -n1 | cut -d '"' -f4)

echo "TOKEN length: ${#TOKEN}"

## 9) Health checks interop (public)

curl -i "https://$DOMAIN_API/api/v1/fhir/metadata"
curl -i "https://$DOMAIN_API/api/v1/cda/metadata"
curl -i "https://$DOMAIN_API/api/v1/terminology/snomed/health"
curl -i "https://$DOMAIN_API/api/v1/icd11/health"
curl -i "https://$DOMAIN_API/api/v1/dicom/health"

## 10) Tests ICD-11 (proteges)

curl -i "https://$DOMAIN_API/api/v1/icd11/search?q=diabete&limit=5" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/icd11/lookup/5A11" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/icd11/validate/5A11" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/icd11/crosswalk/E11.9" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

Attendu:
- reponses JSON sans erreur 500
- data presente

## 11) Tests FHIR (proteges)

curl -i "https://$DOMAIN_API/api/v1/fhir/Patient" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/fhir/Encounter" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/fhir/MedicationRequest" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

Attendu:
- resourceType=Bundle

## 12) Tests CDA generation + validation

curl -s "https://$DOMAIN_API/api/v1/cda/Patient/1/ccd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/xml" > /tmp/ccd.xml

XML_ESCAPED=$(sed ':a;N;$!ba;s/\n/\\n/g;s/"/\\"/g' /tmp/ccd.xml)

curl -i -X POST "https://$DOMAIN_API/api/v1/cda/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"document\":\"$XML_ESCAPED\"}"

Attendu:
- valid=true

## 13) Tests DICOM

curl -i "https://$DOMAIN_API/api/v1/dicom/health" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/dicom/studies" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

## 14) Tests DHIS2 / ENDOS

curl -i "https://$DOMAIN_API/api/v1/dhis2/metadata" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/dhis2/indicators?period=202603" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/dhis2/mapping" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -i "https://$DOMAIN_API/api/v1/dhis2/endos/health" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

Note:
- Si ENDOS_ENABLED=false, le status ENDOS "disabled" est normal.

## 15) Verification frontend interop
Verifier que les pages suivantes se chargent sans erreur JS:
- /interop
- /interop/fhir
- /interop/cda
- /interop/terminology
- /interop/dicom
- /interop/dhis2

Verifier aussi:
- Recherche ICD-11 dans Terminology Browser
- Health cards sur Interop Dashboard
- Generation CDA et validation depuis l'UI

## 16) Probleme connu a verifier
Le endpoint backend CDA /validate attend le champ document. En cas d'erreur depuis l'UI, verifier l'alignement du payload entre:
- Frontend/src/api/index.js (cdaApi.validate)
- Backend/app/Http/Controllers/API/CdaController.php (validate)

## 17) Commandes utiles de diagnostic

cd /var/www/liptakocare/Backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:clear
php artisan cache:clear

tail -f storage/logs/laravel.log

## 18) Criteres GO LIVE interop
- CORS preflight OK
- Login API JSON OK
- ICD-11 health OK + search/lookup/validate/crosswalk OK
- FHIR metadata + au moins 3 bundles metier OK
- CDA generation et validation OK
- DICOM health + list studies OK
- DHIS2 metadata/indicators/mapping OK
- ENDOS conforme a la config (online ou disabled attendu)
- Dashboard frontend interop sans erreur
