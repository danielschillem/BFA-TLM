<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | dcm4chee-arc (PACS / DICOMweb)
    |--------------------------------------------------------------------------
    | Serveur DICOM basé sur dcm4che (https://github.com/dcm4che/dcm4che)
    | Expose les API DICOMweb : QIDO-RS, WADO-RS, STOW-RS
    */
    'dcm4chee' => [
        'base_url' => env('DCM4CHEE_BASE_URL', 'http://localhost:8080/dcm4chee-arc'),
        'aet' => env('DCM4CHEE_AET', 'DCM4CHEE'),
        'wado_rs' => env('DCM4CHEE_WADO_RS', '/aets/DCM4CHEE/rs'),
        'stow_rs' => env('DCM4CHEE_STOW_RS', '/aets/DCM4CHEE/rs'),
        'qido_rs' => env('DCM4CHEE_QIDO_RS', '/aets/DCM4CHEE/rs'),
        'timeout' => (int) env('DCM4CHEE_TIMEOUT', 30),
        'auth' => [
            'enabled' => env('DCM4CHEE_AUTH_ENABLED', true),
            'username' => env('DCM4CHEE_USERNAME'),
            'password' => env('DCM4CHEE_PASSWORD'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | OMS ICD-11 API (Classification Internationale des Maladies)
    |--------------------------------------------------------------------------
    | API officielle de l'OMS pour la CIM-11
    | @see https://icd.who.int/icdapi
    */
    'icd11' => [
        'token_endpoint' => env('ICD11_TOKEN_ENDPOINT', 'https://icdaccessmanagement.who.int/connect/token'),
        'api_base_url' => env('ICD11_API_BASE_URL', 'https://id.who.int'),
        'client_id' => env('ICD11_CLIENT_ID'),
        'client_secret' => env('ICD11_CLIENT_SECRET'),
        'api_version' => env('ICD11_API_VERSION', 'v2'),
        'release_id' => env('ICD11_RELEASE_ID', '2024-01'),
        'language' => env('ICD11_LANGUAGE', 'fr'),
        'linearization' => env('ICD11_LINEARIZATION', 'mms'),  // Mortality and Morbidity Statistics
        'timeout' => (int) env('ICD11_TIMEOUT', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | SNOMED CT (Snowstorm Browser API)
    |--------------------------------------------------------------------------
    | API publique Snowstorm de SNOMED International
    | @see https://browser.ihtsdotools.org/snowstorm/snomed-ct/
    */
    'snomed' => [
        'base_url' => env('SNOMED_BASE_URL', 'https://browser.ihtsdotools.org/snowstorm/snomed-ct'),
        'branch' => env('SNOMED_BRANCH', 'MAIN/2024-09-01'),
        'timeout' => (int) env('SNOMED_TIMEOUT', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | DHIS2 (District Health Information Software 2)
    |--------------------------------------------------------------------------
    | Plateforme de gestion des données sanitaires de l'OMS
    | API Web v2.40+ — @see https://docs.dhis2.org/en/develop/using-the-api/
    */
    'dhis2' => [
        'base_url'      => env('DHIS2_BASE_URL', 'https://dhis2.sante.gov.bf'),
        'api_version'   => env('DHIS2_API_VERSION', '2.40'),
        'username'       => env('DHIS2_USERNAME'),
        'password'       => env('DHIS2_PASSWORD'),
        'timeout'       => (int) env('DHIS2_TIMEOUT', 30),
        // UID des data elements DHIS2 correspondant aux indicateurs TLM
        'data_elements' => [
            'total_consultations'   => env('DHIS2_DE_TOTAL_CONSULTATIONS'),
            'completed_consultations' => env('DHIS2_DE_COMPLETED_CONSULTATIONS'),
            'completion_rate'       => env('DHIS2_DE_COMPLETION_RATE'),
            'no_show_rate'          => env('DHIS2_DE_NO_SHOW_RATE'),
            'total_teleexpertise'   => env('DHIS2_DE_TOTAL_TELEEXPERTISE'),
            'teleexpertise_response_rate' => env('DHIS2_DE_TELEEX_RESPONSE_RATE'),
            'e_prescriptions'       => env('DHIS2_DE_E_PRESCRIPTIONS'),
            'patients_seen'         => env('DHIS2_DE_PATIENTS_SEEN'),
            'structures_count'      => env('DHIS2_DE_STRUCTURES_COUNT'),
        ],
        // UID du dataset DHIS2 pour la télémédecine
        'dataset_uid'   => env('DHIS2_DATASET_UID'),
        // Category combo pour les données agrégées
        'category_combo' => env('DHIS2_CATEGORY_COMBO', 'default'),
    ],

    /*
    |--------------------------------------------------------------------------
    | ENDOS — Entrepôt National de Données Sanitaires (Burkina Faso)
    |--------------------------------------------------------------------------
    | Instance DHIS2 nationale + couche analytique du MSHP
    | Utilise le même protocole DHIS2 Web API
    | @see https://endos.sante.gov.bf
    */
    'endos' => [
        'enabled'       => env('ENDOS_ENABLED', false),
        'base_url'      => env('ENDOS_BASE_URL', 'https://endos.sante.gov.bf'),
        'api_version'   => env('ENDOS_API_VERSION', '2.40'),
        'username'       => env('ENDOS_USERNAME'),
        'password'       => env('ENDOS_PASSWORD'),
        'timeout'       => (int) env('ENDOS_TIMEOUT', 30),
        // UID du dataset spécifique ENDOS pour la télémédecine
        'dataset_uid'   => env('ENDOS_DATASET_UID'),
        // UID de l'org unit racine TLM dans ENDOS
        'org_unit_root' => env('ENDOS_ORG_UNIT_ROOT'),
        // Mapping structures TLM → Org Units ENDOS (JSON)
        'org_unit_mapping' => env('ENDOS_ORG_UNIT_MAPPING'),
    ],

];
