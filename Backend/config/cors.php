<?php

use App\Support\CorsOriginResolver;

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'oauth/*', 'broadcasting/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => CorsOriginResolver::resolve(
        env('CORS_ALLOWED_ORIGINS'),
        env('FRONTEND_URL'),
        env('APP_URL'),
    ),
    'allowed_origins_patterns' => CorsOriginResolver::resolvePatterns(
        env('CORS_ALLOWED_ORIGINS'),
        env('CORS_ALLOWED_ORIGIN_PATTERNS'),
    ),
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-XSRF-TOKEN'],
    'exposed_headers' => ['X-CDA-Version', 'X-CDA-Implementation'],
    'max_age' => 3600,
    'supports_credentials' => true,
];
