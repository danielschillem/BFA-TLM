<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Route d'authentification WebSocket (broadcasting) — compatible Passport Bearer tokens
Broadcast::routes(['middleware' => ['auth:api', 'active']]);
