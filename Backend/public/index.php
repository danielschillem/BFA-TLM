<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

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
