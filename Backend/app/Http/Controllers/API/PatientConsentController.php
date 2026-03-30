<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePatientConsentRequest;
use App\Http\Resources\PatientConsentResource;
use App\Models\PatientConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientConsentController extends Controller
{
    /**
     * Liste des consentements (filtrable par patient, type, statut).
     */
    public function index(Request $request): JsonResponse
    {
        $query = PatientConsent::with(['patient', 'user', 'revokedByUser']);

        if ($request->filled('patient_id')) {
            $query->forPatient($request->integer('patient_id'));
        }

        if ($request->filled('type')) {
            $query->ofType($request->input('type'));
        }

        if ($request->input('active') === 'true') {
            $query->active();
        }

        $consents = $query->orderByDesc('created_at')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => PatientConsentResource::collection($consents),
            'meta' => [
                'current_page' => $consents->currentPage(),
                'last_page' => $consents->lastPage(),
                'total' => $consents->total(),
            ],
        ]);
    }

    /**
     * Enregistrer un nouveau consentement (avec versioning automatique).
     */
    public function store(StorePatientConsentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Versioning : incrémenter si un consentement du même type existe déjà pour ce patient
        $latestVersion = PatientConsent::forPatient($validated['patient_id'])
            ->ofType($validated['type'])
            ->max('version');

        $consent = PatientConsent::create([
            ...$validated,
            'version' => ($latestVersion ?? 0) + 1,
            'accepted_at' => $validated['accepted'] ? now() : null,
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $consent->load(['patient', 'user']);

        return response()->json([
            'success' => true,
            'message' => 'Consentement enregistré (version ' . $consent->version . ').',
            'data' => new PatientConsentResource($consent),
        ], 201);
    }

    /**
     * Afficher un consentement.
     */
    public function show(int $id): JsonResponse
    {
        $consent = PatientConsent::with(['patient', 'user', 'revokedByUser'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new PatientConsentResource($consent),
        ]);
    }

    /**
     * Révoquer un consentement (retrait — OMS/RGPD Art. 7).
     */
    public function withdraw(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'motif_revocation' => ['required', 'string', 'max:500'],
        ]);

        $consent = PatientConsent::findOrFail($id);

        if (!$consent->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Ce consentement est déjà révoqué ou n\'a jamais été accepté.',
            ], 422);
        }

        $consent->update([
            'revoked_at' => now(),
            'motif_revocation' => $request->input('motif_revocation'),
            'revoked_by' => $request->user()->id,
        ]);

        $consent->load(['patient', 'user', 'revokedByUser']);

        return response()->json([
            'success' => true,
            'message' => 'Consentement révoqué avec succès.',
            'data' => new PatientConsentResource($consent),
        ]);
    }

    /**
     * Historique des consentements d'un patient (toutes versions, tous types).
     */
    public function patientHistory(int $patientId): JsonResponse
    {
        $consents = PatientConsent::with(['user', 'revokedByUser'])
            ->forPatient($patientId)
            ->orderByDesc('created_at')
            ->get();

        // Résumé par type
        $summary = $consents->groupBy('type')->map(function ($group) {
            $latest = $group->first();
            return [
                'type' => $latest->type,
                'latest_version' => $latest->version,
                'is_active' => $latest->is_active,
                'accepted_at' => $latest->accepted_at?->toISOString(),
                'revoked_at' => $latest->revoked_at?->toISOString(),
                'total_versions' => $group->count(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $summary,
                'history' => PatientConsentResource::collection($consents),
            ],
        ]);
    }

    /**
     * Vérifier si un patient a un consentement actif pour un type donné.
     */
    public function check(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'type' => ['required', 'string', 'in:teleconsultation,donnees_medicales,partage_dossier,traitement,recherche'],
        ]);

        $consent = PatientConsent::forPatient($request->integer('patient_id'))
            ->ofType($request->input('type'))
            ->active()
            ->orderByDesc('version')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'has_active_consent' => !is_null($consent),
                'consent' => $consent ? new PatientConsentResource($consent) : null,
            ],
        ]);
    }
}
