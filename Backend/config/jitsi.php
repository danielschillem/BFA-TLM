<?php

return [

    /*
    |--------------------------------------------------------------------------
    | JaaS 8x8.vc – Jitsi as a Service
    |--------------------------------------------------------------------------
    |
    | Configuration de la visioconférence Jitsi via le service JaaS (8x8.vc).
    | Le JWT sécurise l'accès aux salles : seuls les utilisateurs munis d'un
    | token signé peuvent rejoindre une room.
    |
    | Pour obtenir vos identifiants : https://jaas.8x8.vc → Dashboard → API Keys
    |
    */

    'app_id' => env('JAAS_APP_ID', 'vpaas-magic-cookie-ed63b1c31e924e1aa588fe9388143c2c'),

    'api_key_id' => env('JAAS_API_KEY_ID', ''),

    // Clé privée RSA (PEM) fournie par 8x8.vc pour signer les JWT.
    // Stockez le contenu PEM dans JAAS_PRIVATE_KEY ou le chemin dans JAAS_PRIVATE_KEY_PATH.
    'private_key' => env('JAAS_PRIVATE_KEY', ''),
    'private_key_path' => env('JAAS_PRIVATE_KEY_PATH', ''),

    // Durée de validité du JWT en minutes
    'token_ttl' => (int) env('JAAS_TOKEN_TTL', 120),

    // Domaine Jitsi (utilisé côté frontend)
    'domain' => env('JAAS_DOMAIN', '8x8.vc'),

];
