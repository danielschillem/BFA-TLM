<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'oauth/*', 'broadcasting/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_filter(array_map('trim', explode(',',
        env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173')
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-XSRF-TOKEN'],
    'exposed_headers' => ['X-CDA-Version', 'X-CDA-Implementation'],
    'max_age' => 3600,
    'supports_credentials' => true,
];
