<?php

return [

    /*
    |--------------------------------------------------------------------------
    | LiveKit – Visioconférence WebRTC
    |--------------------------------------------------------------------------
    |
    | Le serveur LiveKit génère les rooms. Le backend génère les access tokens
    | JWT (HMAC-SHA256) pour autoriser les participants à rejoindre une room.
    |
    | LIVEKIT_WS_URL : URL WebSocket du serveur LiveKit (ex: wss://lk.example.com)
    | LIVEKIT_API_KEY / API_SECRET : credentials de l'API LiveKit
    |
    */

    'ws_url' => env('LIVEKIT_WS_URL', ''),

    'api_key' => env('LIVEKIT_API_KEY', ''),

    'api_secret' => env('LIVEKIT_API_SECRET', ''),

    // Durée de validité du token en minutes
    'token_ttl' => (int) env('LIVEKIT_TOKEN_TTL', 120),

];
