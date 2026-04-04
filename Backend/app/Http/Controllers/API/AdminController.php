<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $monthStart = now()->startOfMonth();
        $today = now()->toDateString();

        // ── Données de base ──
        $totalConsultations = \App\Models\Consultation::count();
        $completedConsultations = \App\Models\Consultation::where('statut', 'terminee')->count();
        $totalAppointments = \App\Models\RendezVous::count();
        $noShowAppointments = \App\Models\RendezVous::where('statut', 'absent')->count();
        $cancelledAppointments = \App\Models\RendezVous::where('statut', 'annule')->count();
        $totalPrescriptions = \App\Models\Prescription::count();
        $signedPrescriptions = \App\Models\Prescription::where('signee', true)->count();
        $totalTeleexpertise = \App\Models\Teleexpertise::count();
        $answeredTeleexpertise = \App\Models\Teleexpertise::where('statut', 'repondu')->count();
        $totalPatients = \App\Models\Patient::count();

        return response()->json([
            'success' => true,
            'data' => [
                // ── Stats globales ──
                'total_users' => User::count(),
                'active_doctors' => User::role(['doctor', 'specialist'])->where('status', 'actif')->count(),
                'total_patients' => $totalPatients,
                'active_patients' => $totalPatients,
                'consultations_month' => \App\Models\Consultation::where('date', '>=', $monthStart)->count(),
                'appointments_month' => \App\Models\RendezVous::where('date', '>=', $monthStart)->count(),
                'active_users' => User::where('status', 'actif')->count(),
                'pending_verifications' => User::role(['doctor', 'specialist'])->where('status', '!=', 'actif')->count(),

                // ── Indicateurs sanitaires classiques ──
                'health_indicators' => [
                    'total_consultations' => $totalConsultations,
                    'completed_consultations' => $completedConsultations,
                    'completion_rate' => $totalConsultations > 0
                        ? round(($completedConsultations / $totalConsultations) * 100, 1) : 0,
                    'no_show_rate' => $totalAppointments > 0
                        ? round(($noShowAppointments / $totalAppointments) * 100, 1) : 0,
                    'cancellation_rate' => $totalAppointments > 0
                        ? round(($cancelledAppointments / $totalAppointments) * 100, 1) : 0,
                    'patients_seen_today' => \App\Models\Consultation::whereDate('date', $today)
                        ->distinct('dossier_patient_id')->count('dossier_patient_id'),
                    'patients_seen_month' => \App\Models\Consultation::where('date', '>=', $monthStart)
                        ->distinct('dossier_patient_id')->count('dossier_patient_id'),
                    'doctor_patient_ratio' => $totalPatients > 0
                        ? round(User::role(['doctor', 'specialist'])->where('status', 'actif')->count() / $totalPatients, 3) : 0,
                    'urgent_appointments' => \App\Models\RendezVous::where('priorite', 'urgent')->count(),
                    'urgent_rate' => $totalAppointments > 0
                        ? round((\App\Models\RendezVous::where('priorite', 'urgent')->count() / $totalAppointments) * 100, 1) : 0,
                    'diagnostics_count' => \App\Models\Diagnostic::count(),
                    'examens_count' => \App\Models\Examen::count(),
                    'gender_distribution' => [
                        'male' => \App\Models\Patient::where('sexe', 'M')->count(),
                        'female' => \App\Models\Patient::where('sexe', 'F')->count(),
                    ],
                ],

                // ── Indicateurs e-santé / télémédecine ──
                'ehealth_indicators' => [
                    'total_teleexpertise' => $totalTeleexpertise,
                    'teleexpertise_answered' => $answeredTeleexpertise,
                    'teleexpertise_response_rate' => $totalTeleexpertise > 0
                        ? round(($answeredTeleexpertise / $totalTeleexpertise) * 100, 1) : 0,
                    'teleexpertise_month' => \App\Models\Teleexpertise::where('created_at', '>=', $monthStart)->count(),
                    'e_prescriptions' => $totalPrescriptions,
                    'e_prescriptions_signed' => $signedPrescriptions,
                    'e_prescription_rate' => $totalPrescriptions > 0
                        ? round(($signedPrescriptions / $totalPrescriptions) * 100, 1) : 0,
                    'documents_uploaded' => \App\Models\Document::count(),
                    'documents_month' => \App\Models\Document::where('created_at', '>=', $monthStart)->count(),
                    'geographic_coverage' => \App\Models\Localite::whereHas('structures')
                        ->distinct('region')->count('region'),
                    'structures_count' => \App\Models\Structure::where('actif', true)->count(),
                    'regions_with_patients' => \App\Models\Localite::whereHas('users')
                        ->distinct('region')->count('region'),
                ],

                // ── Listes ──
                'pending_doctors_list' => UserResource::collection(
                    User::role(['doctor', 'specialist'])->where('status', '!=', 'actif')
                        ->limit(5)->get()->load('roles')
                ),
                'recent_registrations' => UserResource::collection(
                    User::orderBy('created_at', 'desc')->limit(5)->get()->load('roles')
                ),
            ],
        ]);
    }

    public function listUsers(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenoms', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->role($role);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users),
            'meta' => ['pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]],
        ]);
    }

    private const STATUS_EN_TO_FR = [
        'active'    => 'actif',
        'inactive'  => 'inactif',
        'suspended' => 'suspendu',
        'banned'    => 'suspendu',
    ];

    public function updateUserStatus(int $id, Request $request): JsonResponse
    {
        $statusInput = $request->input('status');
        $statusFr = self::STATUS_EN_TO_FR[$statusInput] ?? $statusInput;

        $request->merge(['status' => $statusFr]);
        $request->validate(['status' => 'required|in:actif,inactif,suspendu']);

        $user = User::findOrFail($id);
        $user->update(['status' => $statusFr]);

        return response()->json([
            'success' => true,
            'message' => 'Statut utilisateur mis à jour',
            'data' => new UserResource($user->fresh()->load('roles')),
        ]);
    }

    public function verifyDoctor(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['status' => 'actif']);

        return response()->json([
            'success' => true,
            'message' => 'Médecin vérifié',
        ]);
    }

    /**
     * Afficher le détail d'un utilisateur.
     * GET /admin/users/{id}
     */
    public function showUser(int $id): JsonResponse
    {
        $user = User::with(['roles', 'structure', 'service', 'patient.dossier'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Créer un utilisateur (admin uniquement).
     * POST /admin/users
     */
    public function storeUser(Request $request): JsonResponse
    {
        $request->validate([
            'nom'          => 'required|string|max:255',
            'prenoms'      => 'required|string|max:255',
            'email'        => 'required|email|unique:users,email',
            'password'     => ['required', 'string', 'min:8', \Illuminate\Validation\Rules\Password::min(8)->mixedCase()->numbers()],
            'telephone_1'  => 'nullable|string|max:20',
            'sexe'         => 'nullable|in:M,F',
            'role'         => 'required|string|exists:roles,name',
            'specialite'   => 'nullable|string|max:255',
            'structure_id' => 'nullable|integer|exists:structures,id',
            'service_id'   => 'nullable|integer|exists:services,id',
        ]);

        $user = User::create([
            'nom'          => $request->nom,
            'prenoms'      => $request->prenoms,
            'email'        => $request->email,
            'password'     => $request->password,
            'telephone_1'  => $request->telephone_1,
            'sexe'         => $request->sexe,
            'specialite'   => $request->specialite,
            'structure_id' => $request->structure_id,
            'service_id'   => $request->service_id,
            'status'       => 'actif',
            'created_by_id' => $request->user()->id,
        ]);

        $user->assignRole($request->role);

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur créé',
            'data' => new UserResource($user->load('roles')),
        ], 201);
    }

    /**
     * Mettre à jour un utilisateur.
     * PUT /admin/users/{id}
     */
    public function updateUser(int $id, Request $request): JsonResponse
    {
        $user = User::findOrFail($id);

        $request->validate([
            'nom'          => 'sometimes|string|max:255',
            'prenoms'      => 'sometimes|string|max:255',
            'email'        => 'sometimes|email|unique:users,email,' . $user->id,
            'telephone_1'  => 'nullable|string|max:20',
            'sexe'         => 'nullable|in:M,F',
            'specialite'   => 'nullable|string|max:255',
            'structure_id' => 'nullable|integer|exists:structures,id',
            'service_id'   => 'nullable|integer|exists:services,id',
            'role'         => 'sometimes|string|exists:roles,name',
        ]);

        $updateData = array_filter([
            'nom'          => $request->input('nom'),
            'prenoms'      => $request->input('prenoms'),
            'email'        => $request->input('email'),
            'telephone_1'  => $request->input('telephone_1'),
            'sexe'         => $request->input('sexe'),
            'specialite'   => $request->input('specialite'),
            'structure_id' => $request->input('structure_id'),
            'service_id'   => $request->input('service_id'),
        ], fn ($v) => $v !== null);

        $user->update($updateData);

        if ($request->filled('role')) {
            $user->syncRoles([$request->role]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur mis à jour',
            'data' => new UserResource($user->fresh()->load('roles')),
        ]);
    }

    /**
     * Supprimer un utilisateur (soft delete).
     * DELETE /admin/users/{id}
     */
    public function destroyUser(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Empêcher la suppression de son propre compte
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur supprimé',
        ]);
    }
}
