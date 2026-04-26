<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class GestionnaireController extends Controller
{
    /**
     * Lister les professionnels de santé de la structure du gestionnaire.
     */
    public function indexProfessionnels(Request $request): JsonResponse
    {
        $manager = $request->user();

        $query = User::role(['doctor', 'specialist', 'health_professional'])
            ->where('structure_id', $manager->structure_id)
            ->with(['roles', 'service', 'grade', 'typeProfessionnelSante']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenoms', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('specialite', 'like', "%{$search}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->role($role);
        }

        if ($serviceId = $request->input('service_id')) {
            $query->where('service_id', $serviceId);
        }

        $professionals = $query->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($professionals),
            'meta' => ['pagination' => [
                'current_page' => $professionals->currentPage(),
                'last_page' => $professionals->lastPage(),
                'per_page' => $professionals->perPage(),
                'total' => $professionals->total(),
            ]],
        ]);
    }

    /**
     * Créer un professionnel de santé et l'affecter à la structure du gestionnaire.
     */
    public function storeProfessionnel(Request $request): JsonResponse
    {
        $manager = $request->user();

        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenoms' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'telephone_1' => ['required', 'string', 'max:20'],
            'telephone_2' => ['nullable', 'string', 'max:20'],
            'sexe' => ['required', 'in:M,F'],
            'date_naissance' => ['required', 'date'],
            'lieu_naissance' => ['required', 'string', 'max:255'],
            'specialite' => ['nullable', 'string', 'max:255'],
            'matricule' => ['required', 'string', 'max:50'],
            'numero_ordre' => ['nullable', 'string', 'max:50'],
            'role' => ['required', 'in:doctor,specialist,health_professional'],
            'service_id' => ['required', 'exists:services,id'],
            'grade_id' => ['required', 'exists:grades,id'],
            'type_professionnel_sante_id' => ['required', 'exists:type_professionnel_santes,id'],
            'localite_id' => ['required', 'exists:localites,id'],
        ]);

        // Vérifier que le service appartient à la structure du gestionnaire
        if (!empty($validated['service_id'])) {
            $serviceExists = \App\Models\Service::where('id', $validated['service_id'])
                ->where('structure_id', $manager->structure_id)
                ->exists();

            if (!$serviceExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le service sélectionné n\'appartient pas à votre structure.',
                ], 422);
            }
        }

        $role = $validated['role'];
        unset($validated['role']);

        $validated['password'] = Hash::make($validated['password']);
        $validated['status'] = 'actif';
        $validated['structure_id'] = $manager->structure_id;
        $validated['created_by_id'] = $manager->id;

        $professional = User::create($validated);
        $professional->assignRole($role);

        return response()->json([
            'success' => true,
            'message' => 'Professionnel de santé créé et affecté à la structure',
            'data' => new UserResource($professional->load('roles', 'structure', 'service')),
        ], 201);
    }

    /**
     * Voir le détail d'un professionnel de la structure.
     */
    public function showProfessionnel(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $professional = User::role(['doctor', 'specialist', 'health_professional'])
            ->where('structure_id', $manager->structure_id)
            ->with(['roles', 'structure', 'service', 'grade', 'typeProfessionnelSante'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new UserResource($professional),
        ]);
    }

    /**
     * Mettre à jour un professionnel de la structure.
     */
    public function updateProfessionnel(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $professional = User::role(['doctor', 'specialist', 'health_professional'])
            ->where('structure_id', $manager->structure_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'nom' => ['sometimes', 'string', 'max:255'],
            'prenoms' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($id)],
            'telephone_1' => ['nullable', 'string', 'max:20'],
            'telephone_2' => ['nullable', 'string', 'max:20'],
            'sexe' => ['sometimes', 'in:M,F'],
            'specialite' => ['nullable', 'string', 'max:255'],
            'matricule' => ['nullable', 'string', 'max:50'],
            'numero_ordre' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'in:actif,inactif,suspendu'],
            'service_id' => ['nullable', 'exists:services,id'],
            'grade_id' => ['nullable', 'exists:grades,id'],
            'type_professionnel_sante_id' => ['nullable', 'exists:type_professionnel_santes,id'],
        ]);

        // Vérifier que le service appartient à la structure
        if (!empty($validated['service_id'])) {
            $serviceExists = \App\Models\Service::where('id', $validated['service_id'])
                ->where('structure_id', $manager->structure_id)
                ->exists();

            if (!$serviceExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le service sélectionné n\'appartient pas à votre structure.',
                ], 422);
            }
        }

        $professional->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Professionnel mis à jour',
            'data' => new UserResource($professional->fresh()->load('roles', 'structure', 'service')),
        ]);
    }

    /**
     * Désactiver un professionnel (soft disable, pas de suppression).
     */
    public function toggleStatusProfessionnel(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $professional = User::role(['doctor', 'specialist', 'health_professional'])
            ->where('structure_id', $manager->structure_id)
            ->findOrFail($id);

        $newStatus = $professional->status === 'actif' ? 'inactif' : 'actif';
        $professional->update(['status' => $newStatus]);

        return response()->json([
            'success' => true,
            'message' => $newStatus === 'actif'
                ? 'Professionnel activé'
                : 'Professionnel désactivé',
            'data' => new UserResource($professional->fresh()->load('roles')),
        ]);
    }

    /**
     * Dashboard simplifié du gestionnaire (stats de sa structure).
     */
    public function dashboard(Request $request): JsonResponse
    {
        $manager = $request->user();
        $structureId = $manager->structure_id;

        $doctors = User::role(['doctor', 'specialist'])
            ->where('structure_id', $structureId);
        $healthPros = User::role('health_professional')
            ->where('structure_id', $structureId);
        $allProfessionals = User::role(['doctor', 'specialist', 'health_professional'])
            ->where('structure_id', $structureId);
        $patients = \App\Models\Patient::where('structure_id', $structureId);
        $servicesCount = \App\Models\Service::where('structure_id', $structureId)->count();

        $totalDoctors = (clone $doctors)->count();
        $activeDoctors = (clone $doctors)->where('status', 'actif')->count();
        $totalHealthProfessionals = (clone $healthPros)->count();
        $activeHealthProfessionals = (clone $healthPros)->where('status', 'actif')->count();
        $totalProfessionals = (clone $allProfessionals)->count();
        $activeProfessionals = (clone $allProfessionals)->where('status', 'actif')->count();
        $inactiveProfessionals = max($totalProfessionals - $activeProfessionals, 0);

        return response()->json([
            'success' => true,
            'data' => [
                'structure' => $manager->structure ? [
                    'id' => $manager->structure->id,
                    'name' => $manager->structure->libelle,
                ] : null,
                'total_doctors' => $totalDoctors,
                'active_doctors' => $activeDoctors,
                'total_health_professionals' => $totalHealthProfessionals,
                'active_health_professionals' => $activeHealthProfessionals,
                'total_patients' => (clone $patients)->count(),
                'services_count' => $servicesCount,
                'appointments_month' => \App\Models\RendezVous::where('structure_id', $structureId)
                    ->where('date', '>=', now()->startOfMonth())->count(),
                // Alias pour compatibilité frontend (dashboard cards)
                'total_professionals' => $totalProfessionals,
                'active_professionals' => $activeProfessionals,
                'inactive_professionals' => $inactiveProfessionals,
                'total_services' => $servicesCount,
            ],
        ]);
    }

    /**
     * Lister les services de la structure du gestionnaire.
     */
    public function indexServices(Request $request): JsonResponse
    {
        $manager = $request->user();

        $services = \App\Models\Service::where('structure_id', $manager->structure_id)
            ->withCount('users')
            ->orderBy('libelle')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $services->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->libelle,
                'code' => $s->code,
                'users_count' => $s->users_count,
            ]),
        ]);
    }

    /**
     * Créer un service dans la structure du gestionnaire.
     */
    public function storeService(Request $request): JsonResponse
    {
        $manager = $request->user();

        $validated = $request->validate([
            'libelle' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:20', 'unique:services,code'],
        ]);

        $validated['structure_id'] = $manager->structure_id;

        $service = \App\Models\Service::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Service créé',
            'data' => [
                'id' => $service->id,
                'name' => $service->libelle,
                'code' => $service->code,
            ],
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════
    //  SALLES (structure du gestionnaire)
    // ══════════════════════════════════════════════════════════════

    /**
     * Lister les salles de la structure du gestionnaire.
     */
    public function indexSalles(Request $request): JsonResponse
    {
        $manager = $request->user();

        $salles = \App\Models\Salle::where('structure_id', $manager->structure_id)
            ->with('typeSalle')
            ->orderBy('libelle')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $salles->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->libelle,
                'description' => $s->description,
                'capacite' => $s->capacite,
                'equipements' => $s->equipements,
                'active' => $s->actif,
                'type_salle' => $s->typeSalle ? [
                    'id' => $s->typeSalle->id,
                    'name' => $s->typeSalle->libelle,
                ] : null,
            ]),
        ]);
    }

    /**
     * Créer une salle dans la structure du gestionnaire.
     */
    public function storeSalle(Request $request): JsonResponse
    {
        $manager = $request->user();

        $validated = $request->validate([
            'libelle' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'capacite' => ['nullable', 'integer', 'min:1'],
            'equipements' => ['nullable', 'array'],
            'type_salle_id' => ['nullable', 'exists:type_salles,id'],
        ]);

        $validated['structure_id'] = $manager->structure_id;

        $salle = \App\Models\Salle::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Salle créée',
            'data' => [
                'id' => $salle->id,
                'name' => $salle->libelle,
                'description' => $salle->description,
                'capacite' => $salle->capacite,
                'equipements' => $salle->equipements,
                'active' => $salle->actif,
                'type_salle' => $salle->typeSalle ? [
                    'id' => $salle->typeSalle->id,
                    'name' => $salle->typeSalle->libelle,
                ] : null,
            ],
        ], 201);
    }

    /**
     * Mettre à jour une salle de la structure.
     */
    public function updateSalle(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $salle = \App\Models\Salle::where('structure_id', $manager->structure_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'libelle' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'capacite' => ['nullable', 'integer', 'min:1'],
            'equipements' => ['nullable', 'array'],
            'actif' => ['nullable', 'boolean'],
            'type_salle_id' => ['nullable', 'exists:type_salles,id'],
        ]);

        $salle->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Salle mise à jour',
            'data' => [
                'id' => $salle->id,
                'name' => $salle->libelle,
                'description' => $salle->description,
                'capacite' => $salle->capacite,
                'equipements' => $salle->equipements,
                'active' => $salle->actif,
                'type_salle' => $salle->fresh()->typeSalle ? [
                    'id' => $salle->fresh()->typeSalle->id,
                    'name' => $salle->fresh()->typeSalle->libelle,
                ] : null,
            ],
        ]);
    }

    /**
     * Supprimer une salle de la structure.
     */
    public function destroySalle(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $salle = \App\Models\Salle::where('structure_id', $manager->structure_id)
            ->findOrFail($id);

        $salle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Salle supprimée',
        ]);
    }
}
