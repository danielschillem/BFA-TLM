<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Passport Guard
    |--------------------------------------------------------------------------
    |
    | Here you may specify which authentication guard Passport will use when
    | authenticating users. This value should correspond with one of your
    | guards that is already present in your "auth" configuration file.
    |
    */

    'guard' => 'api',

    'middleware' => [],

    /*
    |--------------------------------------------------------------------------
    | Token Lifetimes
    |--------------------------------------------------------------------------
    |
    | Délais d'expiration des tokens OAuth2 pour limiter la fenêtre d'attaque
    | en cas de compromission. Access tokens courts, refresh tokens modérés.
    |
    */

    'tokens_expire_in' => (int) env('PASSPORT_TOKEN_EXPIRE_MINUTES', 60),               // 1 heure
    'refresh_tokens_expire_in' => (int) env('PASSPORT_REFRESH_TOKEN_EXPIRE_DAYS', 14),   // 14 jours
    'personal_access_tokens_expire_in' => (int) env('PASSPORT_PAT_EXPIRE_HOURS', 6),     // 6 heures

    /*
    |--------------------------------------------------------------------------
    | Encryption Keys
    |--------------------------------------------------------------------------
    |
    | Passport uses encryption keys while generating secure access tokens for
    | your application. By default, the keys are stored as local files but
    | can be set via environment variables when that is more convenient.
    |
    */

    'private_key' => env('PASSPORT_PRIVATE_KEY'),

    'public_key' => env('PASSPORT_PUBLIC_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Passport Database Connection
    |--------------------------------------------------------------------------
    |
    | By default, Passport's models will utilize your application's default
    | database connection. If you wish to use a different connection you
    | may specify the configured name of the database connection here.
    |
    */

    'connection' => env('PASSPORT_CONNECTION'),

];
