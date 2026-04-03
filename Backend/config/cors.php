<?php

$configuredOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173'))
)));

$configuredOriginPatterns = array_values(array_filter(array_map(
    'trim',
    explode(',', env('CORS_ALLOWED_ORIGINS_PATTERNS', ''))
)));

$literalOrigins = [];
$wildcardOriginPatterns = [];

foreach ($configuredOrigins as $origin) {
    if (str_contains($origin, '*')) {
        $wildcardOriginPatterns[] = '^' . str_replace('\\*', '.*', preg_quote($origin, '/')) . '$';
        continue;
    }

    $literalOrigins[] = $origin;
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'oauth/*', 'broadcasting/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => $literalOrigins,
    'allowed_origins_patterns' => [...$configuredOriginPatterns, ...$wildcardOriginPatterns],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-XSRF-TOKEN', 'X-Api-Path'],
    'exposed_headers' => ['X-CDA-Version', 'X-CDA-Implementation'],
    'max_age' => 3600,
    'supports_credentials' => true,
];
