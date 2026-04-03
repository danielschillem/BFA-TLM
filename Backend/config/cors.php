<?php

// CORS ouvert pour phase de test fonctionnel
// TODO: Restaurer CorsOriginResolver après validation
// use App\Support\CorsOriginResolver;

return [
    'paths' => ['api/*', 'api.php', 'sanctum/csrf-cookie', 'oauth/*', 'broadcasting/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['X-CDA-Version', 'X-CDA-Implementation'],
    'max_age' => 3600,
    'supports_credentials' => false,
];
