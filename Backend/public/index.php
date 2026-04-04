<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

function tlm_read_env_value(string $key, string $default = ''): string
{
    $value = getenv($key);

    if ($value === false && isset($_SERVER[$key])) {
        $value = $_SERVER[$key];
    }

    if ($value === false && isset($_ENV[$key])) {
        $value = $_ENV[$key];
    }

    if ($value === false) {
        static $envFile = null;

        if ($envFile === null) {
            $envFile = [];
            $envPath = dirname(__DIR__) . '/.env';

            if (is_file($envPath)) {
                foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                    $line = trim($line);

                    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                        continue;
                    }

                    [$envKey, $envValue] = explode('=', $line, 2);
                    $envFile[trim($envKey)] = trim($envValue, " \t\n\r\0\x0B\"'");
                }
            }
        }

        $value = $envFile[$key] ?? $default;
    }

    return is_string($value) ? trim($value) : $default;
}

function tlm_parse_csv_env(string $key, string $default = ''): array
{
    $value = tlm_read_env_value($key, $default);

    return array_values(array_filter(array_map('trim', explode(',', $value))));
}

function tlm_origin_matches(string $origin, array $allowedOrigins, array $allowedPatterns): bool
{
    if ($origin === '') {
        return false;
    }

    foreach ($allowedOrigins as $allowedOrigin) {
        if (str_contains($allowedOrigin, '*')) {
            $pattern = '/^' . str_replace('\\*', '.*', preg_quote($allowedOrigin, '/')) . '$/i';
            if (preg_match($pattern, $origin)) {
                return true;
            }

            continue;
        }

        if (strcasecmp($allowedOrigin, $origin) === 0) {
            return true;
        }
    }

    foreach ($allowedPatterns as $allowedPattern) {
        if ($allowedPattern !== '') {
            // Sécurité : valider le pattern avant utilisation (éviter ReDoS / injection regex)
            $safePattern = '/' . $allowedPattern . '/i';
            if (@preg_match($safePattern, '') === false) {
                continue; // Pattern invalide, ignorer
            }
            if (preg_match($safePattern, $origin)) {
                return true;
            }
        }
    }

    return false;
}

// ── CORS preflight global ───────────────────────────────────────────────────
// Le navigateur envoie OPTIONS automatiquement SANS le header X-Api-Path.
// On doit donc intercepter OPTIONS ici, avant tout le reste, pour renvoyer
// les bons headers CORS — sinon le preflight échoue et le navigateur bloque
// la vraie requête (POST/GET/PUT...).
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With, X-XSRF-TOKEN, X-Api-Path');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

// ── CDN Gateway (Hostinger hcdn) ────────────────────────────────────────────
// Le CDN Hostinger bloque les GET/POST vers des URL propres (/api/v1/...).
// Seul POST/GET /index.php est transmis à PHP.
// Le frontend envoie le vrai chemin API dans le header X-Api-Path
// et toutes les requêtes passent par /index.php.
// Exemple : POST /index.php  +  X-Api-Path: /auth/login
//         → Laravel traite POST /api/v1/auth/login
$gatewayPath = $_SERVER['HTTP_X_API_PATH'] ?? null;
if ($gatewayPath !== null && $gatewayPath !== '') {
    $gatewayPath = '/' . ltrim($gatewayPath, '/');

    // ── Sécurité : protection path traversal sur X-Api-Path ──
    // Bloquer les séquences dangereuses (.., barres arrière, caractères non-ASCII, null bytes)
    if (preg_match('#\.\.|\\\\ |\x00|%00|%2e%2e#i', $gatewayPath)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid API path']);
        exit;
    }
    // Autoriser uniquement les caractères de chemin URL valides
    if (!preg_match('#^[/a-zA-Z0-9_\-\.\$]+$#', $gatewayPath)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid API path characters']);
        exit;
    }

    // Reconstruire la query string (sans _path si présent par fallback)
    $queryParams = $_GET;
    unset($queryParams['_path']);
    $qs = http_build_query($queryParams);

    $_SERVER['REQUEST_URI']  = '/api/v1' . $gatewayPath . ($qs ? '?' . $qs : '');
    $_SERVER['SCRIPT_NAME']  = '/index.php';
    $_SERVER['PHP_SELF']     = '/index.php';
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../bootstrap/app.php')
    ->handleRequest(Request::capture());
