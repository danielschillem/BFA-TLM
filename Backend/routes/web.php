<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Fallback "login" : la SPA gère le login côté client (POST /api/v1/auth/login).
// Cette route nommée évite les 500 « Route [login] not defined » émis par
// Authenticate::redirectTo() lorsqu'un client non-JSON (HEAD, crawler) tape une
// route protégée. Elle renvoie systématiquement un 401 JSON.
Route::any('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

// Route d'authentification WebSocket (broadcasting) — compatible Passport Bearer tokens
Broadcast::routes(['middleware' => ['auth:api', 'active']]);
