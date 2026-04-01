<?php

namespace App\Http\Middleware;

use App\Models\License;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckLicense
{
    /**
     * Vérifie que la structure de l'utilisateur possède une licence active.
     * Si la licence est une démo, ajoute les headers X-License-*.
     */
    public function handle(Request $request, Closure $next, ?string $moduleCode = null): Response
    {
        $user = $request->user();

        if (!$user || !$user->structure_id) {
            return $next($request); // Pas de structure → pas de contrainte licence
        }

        $license = License::with('modules')
            ->where('structure_id', $user->structure_id)
            ->where('statut', 'active')
            ->where('date_fin', '>=', now()->toDateString())
            ->latest('date_fin')
            ->first();

        if (!$license) {
            return response()->json([
                'success' => false,
                'message' => 'Licence expirée ou absente. Veuillez renouveler votre licence pour continuer à utiliser LiptakoCare.',
                'error'   => 'license_expired',
                'action'  => 'contact_commercial',
            ], 403);
        }

        // Vérifier le module spécifique si demandé
        if ($moduleCode && !$license->modules->contains('code', $moduleCode)) {
            return response()->json([
                'success' => false,
                'message' => "Le module « {$moduleCode} » n'est pas inclus dans votre licence. Contactez le support pour activer ce module.",
                'error'   => 'module_not_licensed',
                'module'  => $moduleCode,
            ], 403);
        }

        // Ajouter des headers informatifs
        $response = $next($request);

        if ($response instanceof Response) {
            $response->headers->set('X-License-Type', $license->type);
            $response->headers->set('X-License-Days-Left', (string) $license->joursRestants());

            if ($license->isDemo() && $license->joursRestants() <= 3) {
                $response->headers->set('X-License-Warning', 'Votre période d\'évaluation expire dans ' . $license->joursRestants() . ' jour(s).');
            }
        }

        return $response;
    }
}
