<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Models\License;
use App\Models\LicenseModule;
use App\Models\Structure;
use App\Services\LicenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LicenseController extends Controller
{
    use AuthorizesStructureAccess;

    public function __construct(private LicenseService $licenseService) {}

    /**
     * GET /licenses/grille — Grille tarifaire publique.
     */
    public function grille(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->licenseService->getGrilleTarifaire(),
        ]);
    }

    /**
     * POST /licenses/simuler — Simuler le coût d'une licence.
     */
    public function simuler(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type_centre'      => 'required|string',
            'capacite_lits'    => 'integer|min:0',
            'max_utilisateurs' => 'integer|min:1',
            'nombre_sites'     => 'integer|min:1',
            'modules'          => 'array',
            'modules.*'        => 'string|exists:license_modules,code',
        ]);

        $result = $this->licenseService->calculerMontant(
            $data['type_centre'],
            $data['capacite_lits'] ?? 0,
            $data['max_utilisateurs'] ?? 10,
            $data['nombre_sites'] ?? 1,
            $data['modules'] ?? []
        );

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    /**
     * POST /licenses/demo — Créer une licence d'évaluation (14 jours).
     */
    public function creerDemo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'structure_id' => 'required|exists:structures,id',
        ]);

        $this->authorizeStructureAccess((int) $data['structure_id']);

        $structure = Structure::findOrFail($data['structure_id']);

        // Vérifier qu'il n'y a pas déjà eu une démo
        $existingDemo = License::where('structure_id', $structure->id)
            ->where('type', 'demo')
            ->exists();

        if ($existingDemo) {
            return response()->json([
                'success' => false,
                'message' => 'Cette structure a déjà bénéficié d\'une période d\'évaluation.',
            ], 422);
        }

        $license = $this->licenseService->creerDemo($structure, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Licence d\'évaluation activée pour ' . LicenseService::DUREE_DEMO_JOURS . ' jours.',
            'data'    => $license,
        ], 201);
    }

    /**
     * POST /licenses — Créer une licence annuelle.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'structure_id'     => 'required|exists:structures,id',
            'type_centre'      => 'required|string',
            'capacite_lits'    => 'integer|min:0',
            'max_utilisateurs' => 'required|integer|min:1',
            'nombre_sites'     => 'integer|min:1',
            'modules'          => 'array',
            'modules.*'        => 'string|exists:license_modules,code',
            'zone_sanitaire'   => 'nullable|string|max:255',
            'notes'            => 'nullable|string|max:1000',
        ]);

        $structure = Structure::findOrFail($data['structure_id']);

        $license = $this->licenseService->creerLicenceAnnuelle(
            structure: $structure,
            typeCentre: $data['type_centre'],
            capaciteLits: $data['capacite_lits'] ?? 0,
            maxUtilisateurs: $data['max_utilisateurs'],
            nombreSites: $data['nombre_sites'] ?? 1,
            moduleCodes: $data['modules'] ?? [],
            createdById: $request->user()->id,
            zoneSanitaire: $data['zone_sanitaire'] ?? null,
            notes: $data['notes'] ?? null,
        );

        return response()->json([
            'success' => true,
            'message' => 'Licence annuelle créée avec succès.',
            'data'    => $license,
        ], 201);
    }

    /**
     * GET /licenses/{id} — Détail d'une licence.
     */
    public function show(int $id): JsonResponse
    {
        $license = License::with(['modules', 'structure.typeStructure', 'createdBy'])
            ->findOrFail($id);

        $this->authorizeStructureAccess((int) $license->structure_id);

        return response()->json([
            'success' => true,
            'data'    => array_merge($license->toArray(), [
                'jours_restants' => $license->joursRestants(),
                'est_active'     => $license->isActive(),
                'est_demo'       => $license->isDemo(),
            ]),
        ]);
    }

    /**
     * GET /licenses/structure/{structureId} — Licences d'une structure.
     */
    public function parStructure(int $structureId): JsonResponse
    {
        $this->authorizeStructureAccess($structureId);

        $licenses = License::with('modules')
            ->where('structure_id', $structureId)
            ->orderByDesc('date_fin')
            ->get()
            ->map(fn($l) => array_merge($l->toArray(), [
                'jours_restants' => $l->joursRestants(),
                'est_active'     => $l->isActive(),
            ]));

        return response()->json([
            'success' => true,
            'data'    => $licenses,
        ]);
    }

    /**
     * GET /licenses/verifier/{structureId} — Vérifier la licence active.
     */
    public function verifier(int $structureId): JsonResponse
    {
        $this->authorizeStructureAccess($structureId);

        $result = $this->licenseService->verifierLicence($structureId);

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    /**
     * POST /licenses/{id}/renouveler — Renouveler une licence.
     */
    public function renouveler(int $id): JsonResponse
    {
        $license = License::findOrFail($id);

        if ($license->isDemo()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de renouveler une licence démo. Veuillez souscrire à une licence annuelle.',
            ], 422);
        }

        $renewed = $this->licenseService->renouveler($license);

        return response()->json([
            'success' => true,
            'message' => 'Licence renouvelée jusqu\'au ' . $renewed->date_fin->format('d/m/Y') . '.',
            'data'    => $renewed,
        ]);
    }

    /**
     * PATCH /licenses/{id}/suspendre — Suspendre une licence.
     */
    public function suspendre(int $id): JsonResponse
    {
        $license = License::findOrFail($id);
        $license->update(['statut' => 'suspendue']);

        return response()->json([
            'success' => true,
            'message' => 'Licence suspendue.',
        ]);
    }

    /**
     * GET /licenses/modules — Liste des modules disponibles.
     */
    public function modules(): JsonResponse
    {
        $modules = LicenseModule::where('actif', true)
            ->select('id', 'code', 'libelle', 'description', 'prix_unitaire_fcfa', 'inclus_base')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $modules,
        ]);
    }

    /**
     * GET /licenses/statistiques — Statistiques licences (admin).
     */
    public function statistiques(): JsonResponse
    {
        $stats = [
            'total_licences'    => License::count(),
            'actives'           => License::active()->count(),
            'demos_actives'     => License::active()->demo()->count(),
            'expirees'          => License::where('statut', 'expiree')->count(),
            'suspendues'        => License::where('statut', 'suspendue')->count(),
            'revenu_annuel_fcfa'=> License::where('type', '!=', 'demo')
                                    ->where('statut', 'active')
                                    ->sum('montant_total_fcfa'),
            'par_type_centre'   => License::where('statut', 'active')
                                    ->selectRaw('type_centre, count(*) as total, sum(montant_total_fcfa) as revenu')
                                    ->groupBy('type_centre')
                                    ->get(),
            'expirant_30j'      => License::active()
                                    ->where('date_fin', '<=', now()->addDays(30)->toDateString())
                                    ->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => $stats,
        ]);
    }
}
