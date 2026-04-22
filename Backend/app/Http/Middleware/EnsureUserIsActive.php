<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Bloque les utilisateurs dont le compte est suspendu ou inactif.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !in_array($user->status, ['active', 'actif'])) {
            // Révoquer le token Sanctum si présent
            if ($user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }

            return response()->json([
                'success' => false,
                'message' => 'Votre compte est désactivé. Contactez l\'administrateur.',
                'error'   => 'account_suspended',
            ], 403);
        }

        return $next($request);
    }
}
