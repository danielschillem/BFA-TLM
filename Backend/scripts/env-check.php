<?php

declare(strict_types=1);

$required = [
    'APP_ENV',
    'APP_URL',
    'FRONTEND_URL',
    'SANCTUM_STATEFUL_DOMAINS',
    'SESSION_DRIVER',
    'SESSION_SECURE_COOKIE',
    'CORS_ALLOWED_ORIGINS',
];

function parseEnvFile(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $vars = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }
        $vars[trim($parts[0])] = trim($parts[1], " \t\n\r\0\x0B\"'");
    }

    return $vars;
}

$envValues = array_merge(
    parseEnvFile(__DIR__ . '/../.env.example'),
    parseEnvFile(__DIR__ . '/../.env'),
    $_ENV,
    $_SERVER
);

$missing = [];

foreach ($required as $key) {
    $value = $envValues[$key] ?? getenv($key);
    if ($value === false || trim((string) $value) === '') {
        $missing[] = $key;
    }
}

if ($missing !== []) {
    fwrite(STDERR, "[env-check] Missing required environment variables:\n");
    foreach ($missing as $key) {
        fwrite(STDERR, " - {$key}\n");
    }
    exit(1);
}

fwrite(STDOUT, "[env-check] OK\n");
