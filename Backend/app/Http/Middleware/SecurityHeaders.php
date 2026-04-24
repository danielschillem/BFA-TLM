<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $isLocal = app()->isLocal();

        // ── Protections contre les attaques courantes ──
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions-Policy : autoriser caméra/micro (téléconsultation LiveKit)
        // mais bloquer les API sensibles non utilisées
        $response->headers->set('Permissions-Policy', implode(', ', [
            'camera=(self)',
            'microphone=(self)',
            'geolocation=()',
            'payment=()',
            'usb=()',
            'magnetometer=()',
            'gyroscope=()',
            'accelerometer=()',
        ]));

        // Cross-Origin Isolation (protection contre Spectre/side-channel)
        // En prod, frontend et API sont sur des domaines séparés :
        // COOP same-origin-allow-popups autorise les popups tout en protégeant contre Spectre
        // CORP cross-origin est requis pour que le frontend puisse charger les réponses API
        if ($request->is('api/*')) {
            $response->headers->set('Cross-Origin-Resource-Policy', 'cross-origin');
        } else {
            $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');
        }
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

        // Content-Security-Policy — protection XSS, injection, exfiltration (OWASP A03:2021)
        $connectSrc = [
            "'self'",
            'wss://liptakocare.com',
            'https://id.who.int',
            'https://*.livekit.cloud',
            'wss://*.livekit.cloud',
        ];

        // Autoriser explicitement les endpoints locaux en développement
        // (API Sanctum + Reverb) pour éviter les blocages CSP côté navigateur.
        if ($isLocal) {
            $connectSrc = array_merge($connectSrc, [
                'http://127.0.0.1:8000',
                'http://localhost:8000',
                'http://127.0.0.1',
                'http://localhost',
                'ws://127.0.0.1:8080',
                'ws://localhost:8080',
                'ws://127.0.0.1',
                'ws://localhost',
                'wss://127.0.0.1',
                'wss://localhost',
                'ws://127.0.0.1:*',
                'ws://localhost:*',
                'wss://127.0.0.1:*',
                'wss://localhost:*',
                'http://127.0.0.1:5173',
                'http://localhost:5173',
            ]);
        }

        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob:",
            "font-src 'self' https://fonts.gstatic.com",
            'connect-src '.implode(' ', array_unique($connectSrc)),
            "media-src 'self' blob:",
            "frame-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]));

        // Politique de permissions inter-domaines
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        // Cache — pas de cache pour les réponses API authentifiées
        if ($request->user()) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        // HSTS en production uniquement
        if (!app()->isLocal() && request()->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        return $response;
    }
}
