<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCertificatDecesRequest;
use App\Http\Resources\CertificatDecesResource;
use App\Models\CertificatDeces;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CertificatDecesController extends Controller
{
    /**
     * Liste des certificats de décès (filtrable).
     */
    public function index(Request $request): JsonResponse
    {
        $query = CertificatDeces::with(['patient', 'medecinCertificateur', 'structure']);

        if ($request->filled('statut')) {
            $query->where('statut', $request->input('statut'));
        }

        if ($request->filled('structure_id')) {
            $query->byStructure($request->integer('structure_id'));
        }

        if ($request->filled('date_debut') && $request->filled('date_fin')) {
            $query->byPeriode($request->input('date_debut'), $request->input('date_fin'));
        }

        if ($request->filled('maniere_deces')) {
            $query->where('maniere_deces', $request->input('maniere_deces'));
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->integer('patient_id'));
        }

        $certificats = $query->orderByDesc('date_deces')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => CertificatDecesResource::collection($certificats),
            'meta' => [
                'current_page' => $certificats->currentPage(),
                'last_page' => $certificats->lastPage(),
                'total' => $certificats->total(),
            ],
        ]);
    }

    /**
     * Créer un nouveau certificat de décès (brouillon).
     */
    public function store(StoreCertificatDecesRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['medecin_certificateur_id'] = $request->user()->id;
        $validated['structure_id'] = $request->user()->structure_id;

        $certificat = CertificatDeces::create($validated);
        $certificat->refresh();
        $certificat->load(['patient', 'medecinCertificateur', 'structure']);

        return response()->json([
            'success' => true,
            'message' => 'Certificat de décès créé (brouillon).',
            'data' => new CertificatDecesResource($certificat),
        ], 201);
    }

    /**
     * Afficher un certificat de décès.
     */
    public function show(int $id): JsonResponse
    {
        $certificat = CertificatDeces::with([
            'patient', 'dossierPatient', 'medecinCertificateur',
            'validateur', 'structure', 'consultation',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new CertificatDecesResource($certificat),
        ]);
    }

    /**
     * Mettre à jour un certificat (uniquement brouillon).
     */
    public function update(StoreCertificatDecesRequest $request, int $id): JsonResponse
    {
        $certificat = CertificatDeces::findOrFail($id);

        if ($certificat->statut !== 'brouillon') {
            return response()->json([
                'success' => false,
                'message' => 'Seul un certificat en brouillon peut être modifié.',
            ], 422);
        }

        $this->authorizeOwnerOrAdmin($certificat, $request->user());

        $certificat->update($request->validated());
        $certificat->load(['patient', 'medecinCertificateur', 'structure']);

        return response()->json([
            'success' => true,
            'message' => 'Certificat mis à jour.',
            'data' => new CertificatDecesResource($certificat),
        ]);
    }

    /**
     * Certifier le certificat — le médecin signe électroniquement.
     * Transition : brouillon → certifié
     */
    public function certifier(int $id, Request $request): JsonResponse
    {
        $certificat = CertificatDeces::findOrFail($id);

        if ($certificat->statut !== 'brouillon') {
            return response()->json([
                'success' => false,
                'message' => 'Ce certificat ne peut pas être certifié (statut actuel : ' . $certificat->statut . ').',
            ], 422);
        }

        $this->authorizeOwnerOrAdmin($certificat, $request->user());

        $certificat->update([
            'statut' => 'certifie',
            'date_certification' => now(),
        ]);

        $certificat->load(['patient', 'medecinCertificateur']);

        return response()->json([
            'success' => true,
            'message' => 'Certificat de décès certifié par Dr. ' . $request->user()->full_name . '.',
            'data' => new CertificatDecesResource($certificat),
        ]);
    }

    /**
     * Valider le certificat (par un administrateur / responsable).
     * Transition : certifié → validé
     */
    public function valider(int $id, Request $request): JsonResponse
    {
        $certificat = CertificatDeces::findOrFail($id);

        if ($certificat->statut !== 'certifie') {
            return response()->json([
                'success' => false,
                'message' => 'Seul un certificat certifié peut être validé.',
            ], 422);
        }

        $certificat->update([
            'statut' => 'valide',
            'validateur_id' => $request->user()->id,
            'date_validation' => now(),
        ]);

        $certificat->load(['patient', 'medecinCertificateur', 'validateur']);

        return response()->json([
            'success' => true,
            'message' => 'Certificat de décès validé.',
            'data' => new CertificatDecesResource($certificat),
        ]);
    }

    /**
     * Rejeter un certificat certifié (par un administrateur / responsable).
     * Transition : certifié → rejeté
     */
    public function rejeter(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'motif_rejet' => ['required', 'string', 'max:1000'],
        ]);

        $certificat = CertificatDeces::findOrFail($id);

        if ($certificat->statut !== 'certifie') {
            return response()->json([
                'success' => false,
                'message' => 'Seul un certificat certifié peut être rejeté.',
            ], 422);
        }

        $certificat->update([
            'statut' => 'rejete',
            'motif_rejet' => $request->input('motif_rejet'),
            'validateur_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Certificat rejeté.',
            'data' => new CertificatDecesResource($certificat->load(['patient', 'medecinCertificateur'])),
        ]);
    }

    /**
     * Annuler un certificat.
     * Transition : brouillon|rejeté → annulé
     */
    public function annuler(int $id, Request $request): JsonResponse
    {
        $certificat = CertificatDeces::findOrFail($id);

        if (!in_array($certificat->statut, ['brouillon', 'rejete'])) {
            return response()->json([
                'success' => false,
                'message' => 'Seul un certificat en brouillon ou rejeté peut être annulé.',
            ], 422);
        }

        $this->authorizeOwnerOrAdmin($certificat, $request->user());

        $certificat->update(['statut' => 'annule']);

        return response()->json([
            'success' => true,
            'message' => 'Certificat annulé.',
        ]);
    }

    /**
     * Statistiques de mortalité.
     */
    public function statistiques(Request $request): JsonResponse
    {
        $query = CertificatDeces::query()->whereIn('statut', ['certifie', 'valide']);

        if ($request->filled('structure_id')) {
            $query->byStructure($request->integer('structure_id'));
        }

        if ($request->filled('date_debut') && $request->filled('date_fin')) {
            $query->byPeriode($request->input('date_debut'), $request->input('date_fin'));
        }

        $total = $query->count();

        // Répartition par manière de décès
        $parManiere = (clone $query)->selectRaw('maniere_deces, COUNT(*) as total')
            ->groupBy('maniere_deces')
            ->pluck('total', 'maniere_deces');

        // Répartition par type de lieu
        $parLieu = (clone $query)->selectRaw('type_lieu_deces, COUNT(*) as total')
            ->groupBy('type_lieu_deces')
            ->pluck('total', 'type_lieu_deces');

        // Répartition par sexe
        $parSexe = (clone $query)->selectRaw('sexe_defunt, COUNT(*) as total')
            ->groupBy('sexe_defunt')
            ->pluck('total', 'sexe_defunt');

        // Top 10 causes directes (codes ICD-11)
        $topCauses = (clone $query)->selectRaw('cause_directe_code_icd11, cause_directe, COUNT(*) as total')
            ->whereNotNull('cause_directe_code_icd11')
            ->groupBy('cause_directe_code_icd11', 'cause_directe')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Mortalité maternelle
        $mortaliteMaternelle = (clone $query)->where('grossesse_contribue', true)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_deces' => $total,
                'par_maniere' => $parManiere,
                'par_lieu' => $parLieu,
                'par_sexe' => $parSexe,
                'top_causes_icd11' => $topCauses,
                'mortalite_maternelle' => $mortaliteMaternelle,
            ],
        ]);
    }

    private function authorizeOwnerOrAdmin(CertificatDeces $certificat, $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }
        if ($certificat->medecin_certificateur_id === $user->id) {
            return;
        }
        abort(403, 'Vous n\'êtes pas autorisé à modifier ce certificat.');
    }
}
