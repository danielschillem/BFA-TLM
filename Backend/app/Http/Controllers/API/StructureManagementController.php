<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\StructureResource;
use App\Http\Resources\UserResource;
use App\Models\Structure;
use App\Models\Service;
use App\Models\TypeStructure;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StructureManagementController extends Controller
{
    // ══════════════════════════════════════════════════════════════
    //  TYPE DE STRUCTURE (Admin only)
    // ══════════════════════════════════════════════════════════════

    public function indexTypeStructures(Request $request): JsonResponse
    {
        $query = TypeStructure::query();

        if ($search = $request->input('search')) {
            $query->where('libelle', 'like', "%{$search}%");
        }

        $types = $query->orderBy('libelle')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $types->items(),
            'meta' => ['pagination' => [
                'current_page' => $types->currentPage(),
                'last_page' => $types->lastPage(),
                'per_page' => $types->perPage(),
                'total' => $types->total(),
            ]],
        ]);
    }

    public function storeTypeStructure(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'libelle' => ['required', 'string', 'max:255', 'unique:type_structures,libelle'],
            'description' => ['nullable', 'string'],
            'actif' => ['nullable', 'boolean'],
        ]);

        $type = TypeStructure::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Type de structure créé',
            'data' => $type,
        ], 201);
    }

    public function showTypeStructure(int $id): JsonResponse
    {
        $type = TypeStructure::withCount('structures')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $type,
        ]);
    }

    public function updateTypeStructure(Request $request, int $id): JsonResponse
    {
        $type = TypeStructure::findOrFail($id);

        $validated = $request->validate([
            'libelle' => ['sometimes', 'string', 'max:255', Rule::unique('type_structures', 'libelle')->ignore($id)],
            'description' => ['nullable', 'string'],
            'actif' => ['nullable', 'boolean'],
        ]);

        $type->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Type de structure mis à jour',
            'data' => $type->fresh(),
        ]);
    }

    public function destroyTypeStructure(int $id): JsonResponse
    {
        $type = TypeStructure::findOrFail($id);

        if ($type->structures()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : des structures utilisent ce type.',
            ], 422);
        }

        $type->delete();

        return response()->json([
            'success' => true,
            'message' => 'Type de structure supprimé',
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  STRUCTURES (Admin only)
    // ══════════════════════════════════════════════════════════════

    public function indexStructures(Request $request): JsonResponse
    {
        $query = Structure::with(['typeStructure', 'localite', 'createdBy'])
            ->withCount(['services', 'users']);

        if ($search = $request->input('search')) {
            $query->where('libelle', 'like', "%{$search}%");
        }

        if ($typeId = $request->input('type_structure_id')) {
            $query->where('type_structure_id', $typeId);
        }

        $structures = $query->orderBy('libelle')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $structures->through(fn ($s) => [
                'id' => $s->id,
                'name' => $s->libelle,
                'phone' => $s->telephone,
                'email' => $s->email,
                'logo' => $s->logo,
                'active' => $s->actif,
                'type' => $s->typeStructure ? [
                    'id' => $s->typeStructure->id,
                    'name' => $s->typeStructure->libelle,
                ] : null,
                'localite' => $s->localite,
                'created_by' => $s->createdBy ? [
                    'id' => $s->createdBy->id,
                    'full_name' => $s->createdBy->full_name,
                ] : null,
                'services_count' => $s->services_count,
                'users_count' => $s->users_count,
                'created_at' => $s->created_at?->toISOString(),
            ]),
            'meta' => ['pagination' => [
                'current_page' => $structures->currentPage(),
                'last_page' => $structures->lastPage(),
                'per_page' => $structures->perPage(),
                'total' => $structures->total(),
            ]],
        ]);
    }

    public function storeStructure(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'libelle' => ['required', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'logo' => ['nullable', 'string'],
            'actif' => ['nullable', 'boolean'],
            'type_structure_id' => ['nullable', 'exists:type_structures,id'],
            'localite_id' => ['nullable', 'exists:localites,id'],
        ]);

        $validated['created_by_id'] = $request->user()->id;

        $structure = Structure::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Structure créée',
            'data' => new StructureResource($structure->load('typeStructure', 'localite')),
        ], 201);
    }

    public function showStructure(int $id): JsonResponse
    {
        $structure = Structure::with(['typeStructure', 'localite', 'services', 'createdBy'])
            ->withCount(['users', 'services'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new StructureResource($structure),
        ]);
    }

    public function updateStructure(Request $request, int $id): JsonResponse
    {
        $structure = Structure::findOrFail($id);

        $validated = $request->validate([
            'libelle' => ['sometimes', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'logo' => ['nullable', 'string'],
            'actif' => ['nullable', 'boolean'],
            'type_structure_id' => ['nullable', 'exists:type_structures,id'],
            'localite_id' => ['nullable', 'exists:localites,id'],
        ]);

        $structure->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Structure mise à jour',
            'data' => new StructureResource($structure->fresh()->load('typeStructure', 'localite')),
        ]);
    }

    public function destroyStructure(int $id): JsonResponse
    {
        $structure = Structure::findOrFail($id);

        if ($structure->users()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : des utilisateurs sont affectés à cette structure.',
            ], 422);
        }

        $structure->delete();

        return response()->json([
            'success' => true,
            'message' => 'Structure supprimée',
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  SERVICES D'UNE STRUCTURE (Admin only)
    // ══════════════════════════════════════════════════════════════

    public function indexServices(int $structureId): JsonResponse
    {
        $structure = Structure::findOrFail($structureId);

        $services = Service::where('structure_id', $structure->id)
            ->withCount('users')
            ->orderBy('libelle')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $services->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->libelle,
                'code' => $s->code,
                'phone' => $s->telephone,
                'active' => $s->actif,
                'users_count' => $s->users_count,
            ]),
        ]);
    }

    public function storeService(Request $request, int $structureId): JsonResponse
    {
        $structure = Structure::findOrFail($structureId);

        $validated = $request->validate([
            'libelle' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:20', 'unique:services,code'],
            'telephone' => ['nullable', 'string', 'max:20'],
        ]);

        $validated['structure_id'] = $structure->id;

        $service = Service::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Service créé',
            'data' => [
                'id' => $service->id,
                'name' => $service->libelle,
                'code' => $service->code,
                'phone' => $service->telephone,
                'active' => $service->actif,
                'users_count' => 0,
            ],
        ], 201);
    }

    public function updateService(Request $request, int $structureId, int $serviceId): JsonResponse
    {
        $structure = Structure::findOrFail($structureId);

        $service = Service::where('structure_id', $structure->id)->findOrFail($serviceId);

        $validated = $request->validate([
            'libelle' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:20', Rule::unique('services', 'code')->ignore($serviceId)],
            'telephone' => ['nullable', 'string', 'max:20'],
            'actif' => ['nullable', 'boolean'],
        ]);

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Service mis à jour',
            'data' => [
                'id' => $service->id,
                'name' => $service->libelle,
                'code' => $service->code,
                'phone' => $service->telephone,
                'active' => $service->actif,
                'users_count' => $service->users()->count(),
            ],
        ]);
    }

    public function destroyService(int $structureId, int $serviceId): JsonResponse
    {
        $structure = Structure::findOrFail($structureId);

        $service = Service::where('structure_id', $structure->id)->findOrFail($serviceId);

        if ($service->users()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : des professionnels sont affectés à ce service.',
            ], 422);
        }

        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service supprimé',
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  GESTIONNAIRES — Créer des structure_manager (Admin only)
    // ══════════════════════════════════════════════════════════════

    public function indexGestionnaires(Request $request): JsonResponse
    {
        $query = User::role('structure_manager')->with(['structure', 'roles']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenoms', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($structureId = $request->input('structure_id')) {
            $query->where('structure_id', $structureId);
        }

        $gestionnaires = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($gestionnaires),
            'meta' => ['pagination' => [
                'current_page' => $gestionnaires->currentPage(),
                'last_page' => $gestionnaires->lastPage(),
                'per_page' => $gestionnaires->perPage(),
                'total' => $gestionnaires->total(),
            ]],
        ]);
    }

    public function storeGestionnaire(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenoms' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'telephone_1' => ['nullable', 'string', 'max:20'],
            'telephone_2' => ['nullable', 'string', 'max:20'],
            'sexe' => ['required', 'in:M,F'],
            'structure_id' => ['required', 'exists:structures,id'],
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['status'] = 'actif';
        $validated['created_by_id'] = $request->user()->id;

        $gestionnaire = User::create($validated);
        $gestionnaire->assignRole('structure_manager');

        return response()->json([
            'success' => true,
            'message' => 'Gestionnaire créé et affecté à la structure',
            'data' => new UserResource($gestionnaire->load('roles', 'structure')),
        ], 201);
    }
}
