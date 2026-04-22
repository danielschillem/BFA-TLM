<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    // ── Rôles ─────────────────────────────────────────────────────────────────

    public function indexRoles(): JsonResponse
    {
        $roles = Role::where('guard_name', 'web')
            ->withCount('users', 'permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id'                => $role->id,
                'name'              => $role->name,
                'guard_name'        => $role->guard_name,
                'users_count'       => $role->users_count,
                'permissions_count' => $role->permissions_count,
                'created_at'        => $role->created_at,
                'updated_at'        => $role->updated_at,
            ]);

        return response()->json(['success' => true, 'data' => $roles]);
    }

    public function showRole(int $id): JsonResponse
    {
        $role = Role::where('guard_name', 'web')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id'          => $role->id,
                'name'        => $role->name,
                'guard_name'  => $role->guard_name,
                'permissions' => $role->permissions->pluck('name'),
                'users'       => UserResource::collection(
                    User::role($role->name)->limit(50)->get()->load('roles')
                ),
                'created_at'  => $role->created_at,
                'updated_at'  => $role->updated_at,
            ],
        ]);
    }

    public function storeRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:50|regex:/^[a-z_]+$/|unique:roles,name',
            'permissions'   => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create(['name' => $validated['name'], 'guard_name' => 'web']);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'success' => true,
            'message' => 'Rôle créé avec succès',
            'data'    => [
                'id'          => $role->id,
                'name'        => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ],
        ], 201);
    }

    public function updateRole(int $id, Request $request): JsonResponse
    {
        $role = Role::where('guard_name', 'web')->findOrFail($id);

        $validated = $request->validate([
            'name'          => "sometimes|string|max:50|regex:/^[a-z_]+$/|unique:roles,name,{$role->id}",
            'permissions'   => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if (isset($validated['name'])) {
            $role->update(['name' => $validated['name']]);
        }

        if (array_key_exists('permissions', $validated)) {
            $role->syncPermissions($validated['permissions']);
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'success' => true,
            'message' => 'Rôle mis à jour',
            'data'    => [
                'id'          => $role->id,
                'name'        => $role->name,
                'permissions' => $role->permissions()->pluck('name'),
            ],
        ]);
    }

    public function destroyRole(int $id): JsonResponse
    {
        $role = Role::where('guard_name', 'web')->findOrFail($id);

        $protectedRoles = ['admin', 'doctor', 'specialist', 'health_professional', 'patient', 'structure_manager'];

        if (in_array($role->name, $protectedRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Les rôles système ne peuvent pas être supprimés',
            ], 422);
        }

        if ($role->users()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Ce rôle est encore attribué à des utilisateurs',
            ], 422);
        }

        $role->delete();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['success' => true, 'message' => 'Rôle supprimé']);
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    public function indexPermissions(): JsonResponse
    {
        $permissions = Permission::where('guard_name', 'web')
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $p) => [
                'id'         => $p->id,
                'name'       => $p->name,
                'guard_name' => $p->guard_name,
            ]);

        // Grouper par catégorie (avant le point)
        $grouped = $permissions->groupBy(fn ($p) => explode('.', $p['name'])[0]);

        return response()->json([
            'success' => true,
            'data'    => $permissions,
            'grouped' => $grouped,
        ]);
    }

    // ── Assignation rôles utilisateur ─────────────────────────────────────────

    public function userRoles(int $userId): JsonResponse
    {
        $user = User::findOrFail($userId);

        return response()->json([
            'success' => true,
            'data' => [
                'user'        => new UserResource($user->load('roles')),
                'roles'       => $user->roles->pluck('name'),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
        ]);
    }

    public function assignRole(int $userId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'roles'   => 'required|array|min:1',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $user = User::findOrFail($userId);
        $user->syncRoles($validated['roles']);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'success' => true,
            'message' => 'Rôles mis à jour pour l\'utilisateur',
            'data'    => [
                'user'  => new UserResource($user->fresh()->load('roles')),
                'roles' => $user->fresh()->roles->pluck('name'),
            ],
        ]);
    }

    // ── Matrice rôle-permissions ──────────────────────────────────────────────

    public function matrix(): JsonResponse
    {
        $roles = Role::where('guard_name', 'web')
            ->with('permissions')
            ->orderBy('name')
            ->get();

        $permissions = Permission::where('guard_name', 'web')
            ->orderBy('name')
            ->pluck('name');

        $matrix = $roles->map(fn (Role $role) => [
            'role'        => $role->name,
            'permissions' => $role->permissions->pluck('name'),
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'roles'       => $matrix,
                'permissions' => $permissions,
            ],
        ]);
    }
}
