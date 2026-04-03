<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Requests\StoreCertificatDecesRequest;
use App\Http\Resources\CertificatDecesResource;
use App\Models\CertificatDeces;
use App\Models\DossierPatient;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CertificatDecesController extends Controller
{
    use AuthorizesStructureAccess;
    /**
     * Liste des certificats de décès (filtrable).
     */
    public function index(Request $request): JsonResponse
    {
        $query = $this->scopeAccessibleCertificates(
            CertificatDeces::with(['patient', 'medecinCertificateur', 'structure']),
            $request->user()
        );

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

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($builder) use ($search) {
                $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';

                $builder->where('numero_certificat', 'like', $like)
                    ->orWhere('nom_defunt', 'like', $like)
                    ->orWhere('prenoms_defunt', 'like', $like)
                    ->orWhere('cause_directe', 'like', $like);
            });
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
        [$validated] = $this->normalizeCertificatPayload($validated, $request->user());
        $validated['medecin_certificateur_id'] = $request->user()->id;
        $validated['structure_id'] = $validated['structure_id'] ?? $request->user()->structure_id;

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

        $this->authorizeCertificateAccess($certificat, request()->user());

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

        [$validated] = $this->normalizeCertificatPayload($request->validated(), $request->user());

        $certificat->update($validated);
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
        $baseQuery = $this->scopeAccessibleCertificates(CertificatDeces::query(), $request->user());
        $this->applyStatisticsFilters($baseQuery, $request);

        $publishedQuery = (clone $baseQuery)->whereIn('statut', ['certifie', 'valide']);

        $statusCounts = (clone $baseQuery)
            ->selectRaw('statut, COUNT(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        $totalCertificates = (clone $baseQuery)->count();
        $totalDeaths = (clone $publishedQuery)->count();

        $parManiere = (clone $publishedQuery)->selectRaw('maniere_deces, COUNT(*) as total')
            ->groupBy('maniere_deces')
            ->pluck('total', 'maniere_deces');

        $parLieu = (clone $publishedQuery)->selectRaw('type_lieu_deces, COUNT(*) as total')
            ->groupBy('type_lieu_deces')
            ->pluck('total', 'type_lieu_deces');

        $parSexe = (clone $publishedQuery)->selectRaw('sexe_defunt, COUNT(*) as total')
            ->groupBy('sexe_defunt')
            ->pluck('total', 'sexe_defunt')
            ->map(fn ($count) => (int) $count)
            ->toArray();

        $topCauses = (clone $publishedQuery)->selectRaw('cause_directe_code_icd11, cause_directe, COUNT(*) as total')
            ->whereNotNull('cause_directe_code_icd11')
            ->groupBy('cause_directe_code_icd11', 'cause_directe')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function (CertificatDeces $item) use ($totalDeaths) {
                $count = (int) $item->total;
                $percentage = $totalDeaths > 0
                    ? round(($count / $totalDeaths) * 100, 1)
                    : 0.0;

                return [
                    'cause' => $item->cause_directe,
                    'label' => $item->cause_directe,
                    'code_icd11' => $item->cause_directe_code_icd11,
                    'icd11_code' => $item->cause_directe_code_icd11,
                    'count' => $count,
                    'nombre' => $count,
                    'percentage' => $percentage,
                    'pourcentage' => $percentage,
                ];
            })
            ->values()
            ->all();

        $mortaliteMaternelle = (clone $publishedQuery)->where('grossesse_contribue', true)->count();
        $parTrancheAge = $this->buildAgeGroups(
            (clone $publishedQuery)->get(['age_defunt', 'unite_age'])
        );

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $totalDeaths,
                'total_deces' => $totalDeaths,
                'total_certificats' => $totalCertificates,
                'brouillons' => (int) ($statusCounts['brouillon'] ?? 0),
                'certifies' => (int) ($statusCounts['certifie'] ?? 0),
                'valides' => (int) ($statusCounts['valide'] ?? 0),
                'rejetes' => (int) ($statusCounts['rejete'] ?? 0),
                'annules' => (int) ($statusCounts['annule'] ?? 0),
                'par_maniere' => $parManiere,
                'par_lieu' => $parLieu,
                'par_sexe' => $parSexe,
                'by_sex' => $parSexe,
                'top_causes_icd11' => $topCauses,
                'top_causes' => $topCauses,
                'causes_principales' => $topCauses,
                'par_tranche_age' => $parTrancheAge,
                'by_age_group' => $parTrancheAge,
                'mortalite_maternelle' => $mortaliteMaternelle,
                'rate' => null,
            ],
        ]);
    }

    private function applyStatisticsFilters($query, Request $request): void
    {
        if ($request->filled('structure_id')) {
            $query->byStructure($request->integer('structure_id'));
        }

        if ($request->filled('date_debut') && $request->filled('date_fin')) {
            $query->byPeriode($request->input('date_debut'), $request->input('date_fin'));
        }
    }

    private function buildAgeGroups($certificats): array
    {
        $buckets = [
            '0-28 jours' => 0,
            '29 jours - 11 mois' => 0,
            '1-4 ans' => 0,
            '5-14 ans' => 0,
            '15-24 ans' => 0,
            '25-44 ans' => 0,
            '45-64 ans' => 0,
            '65+ ans' => 0,
            'Inconnu' => 0,
        ];

        foreach ($certificats as $certificat) {
            $range = $this->resolveAgeRange($certificat->age_defunt, $certificat->unite_age);
            $buckets[$range] = ($buckets[$range] ?? 0) + 1;
        }

        return collect($buckets)
            ->map(fn ($count, $range) => [
                'range' => $range,
                'tranche' => $range,
                'count' => $count,
                'nombre' => $count,
            ])
            ->values()
            ->all();
    }

    private function resolveAgeRange($age, ?string $unit): string
    {
        if ($age === null || $age === '') {
            return 'Inconnu';
        }

        $value = (float) $age;
        $normalizedUnit = strtolower(trim((string) $unit));

        if (in_array($normalizedUnit, ['jour', 'jours', 'day', 'days'], true)) {
            return $value <= 28 ? '0-28 jours' : '29 jours - 11 mois';
        }

        if (in_array($normalizedUnit, ['semaine', 'semaines', 'week', 'weeks'], true)) {
            return $value <= 4 ? '0-28 jours' : '29 jours - 11 mois';
        }

        if (in_array($normalizedUnit, ['mois', 'month', 'months'], true)) {
            return $value <= 11 ? '29 jours - 11 mois' : $this->resolveYearBucket($value / 12);
        }

        return $this->resolveYearBucket($value);
    }

    private function resolveYearBucket(float $years): string
    {
        return match (true) {
            $years < 1 => '29 jours - 11 mois',
            $years <= 4 => '1-4 ans',
            $years <= 14 => '5-14 ans',
            $years <= 24 => '15-24 ans',
            $years <= 44 => '25-44 ans',
            $years <= 64 => '45-64 ans',
            default => '65+ ans',
        };
    }

    private function normalizeCertificatPayload(array $validated, $user): array
    {
        $patient = null;
        $dossier = null;

        if (!empty($validated['patient_id'])) {
            $patient = Patient::with('dossier')->findOrFail($validated['patient_id']);
            $this->authorizePatientAccess($patient);
        }

        if (!empty($validated['dossier_patient_id'])) {
            $dossier = DossierPatient::with('patient.dossier')->findOrFail($validated['dossier_patient_id']);
            $this->authorizeDossierAccess($dossier->id);

            if ($patient && $dossier->patient_id !== $patient->id) {
                abort(422, 'Le dossier patient ne correspond pas au patient sélectionné.');
            }

            $patient ??= $dossier->patient;
            $validated['patient_id'] = $patient?->id;
        }

        if (!$dossier && $patient?->dossier) {
            $dossier = $patient->dossier;
            $validated['dossier_patient_id'] = $dossier->id;
        }

        if ($patient) {
            $validated['nom_defunt'] = $validated['nom_defunt'] ?? $patient->nom;
            $validated['prenoms_defunt'] = $validated['prenoms_defunt'] ?? $patient->prenoms;
            $validated['date_naissance_defunt'] = $validated['date_naissance_defunt'] ?? ($patient->getRawOriginal('date_naissance') ?: null);
            $validated['lieu_naissance_defunt'] = $validated['lieu_naissance_defunt'] ?? $patient->lieu_naissance;
            $validated['sexe_defunt'] = $validated['sexe_defunt'] ?? $patient->sexe;
            $validated['structure_id'] = $validated['structure_id'] ?? $patient->structure_id;
        }

        $validated['structure_id'] = $validated['structure_id'] ?? $user->structure_id;

        return [$validated, $patient, $dossier];
    }

    private function scopeAccessibleCertificates($query, $user)
    {
        if ($user->hasRole('admin')) {
            return $query;
        }

        return $query->where(function ($builder) use ($user) {
            if ($user->structure_id) {
                $builder->where('structure_id', $user->structure_id)
                    ->orWhere('medecin_certificateur_id', $user->id);

                return;
            }

            $builder->where('medecin_certificateur_id', $user->id);
        });
    }

    private function authorizeCertificateAccess(CertificatDeces $certificat, $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ($certificat->medecin_certificateur_id === $user->id) {
            return;
        }

        if ($user->structure_id && $certificat->structure_id && (int) $certificat->structure_id === (int) $user->structure_id) {
            return;
        }

        abort(403, 'Vous n\'êtes pas autorisé à consulter ce certificat.');
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
