<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $doctor;
    private User $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');

        $this->doctor = User::factory()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->patient = User::factory()->create(['status' => 'actif']);
        $this->patient->assignRole('patient');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Rôles — CRUD
    // ══════════════════════════════════════════════════════════════════════════

    public function test_admin_can_list_roles(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/roles');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [['id', 'name', 'users_count', 'permissions_count']]]);
    }

    public function test_non_admin_cannot_list_roles(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/admin/roles');

        $response->assertForbidden();
    }

    public function test_admin_can_view_single_role(): void
    {
        $role = Role::where('name', 'doctor')->first();

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/v1/admin/roles/{$role->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'doctor')
            ->assertJsonStructure(['data' => ['id', 'name', 'permissions', 'users']]);
    }

    public function test_admin_can_create_role(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/admin/roles', [
                'name'        => 'supervisor',
                'permissions' => ['patients.view', 'consultations.view'],
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'supervisor');

        $this->assertDatabaseHas('roles', ['name' => 'supervisor', 'guard_name' => 'api']);
        $this->assertEquals(2, Role::findByName('supervisor', 'api')->permissions->count());
    }

    public function test_create_role_validates_name_format(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/admin/roles', ['name' => 'Invalid Name!']);

        $response->assertUnprocessable();
    }

    public function test_create_role_rejects_duplicate_name(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/admin/roles', ['name' => 'doctor']);

        $response->assertUnprocessable();
    }

    public function test_admin_can_update_role_permissions(): void
    {
        $role = Role::findByName('doctor', 'api');

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/v1/admin/roles/{$role->id}", [
                'permissions' => ['patients.view'],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $role->refresh();
        $this->assertEquals(1, $role->permissions->count());
        $this->assertTrue($role->hasPermissionTo('patients.view'));
    }

    public function test_admin_can_rename_custom_role(): void
    {
        // Créer un rôle custom d'abord
        Role::create(['name' => 'custom_role', 'guard_name' => 'api']);

        $role = Role::findByName('custom_role', 'api');

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/v1/admin/roles/{$role->id}", ['name' => 'new_custom_name']);

        $response->assertOk();
        $this->assertDatabaseHas('roles', ['name' => 'new_custom_name']);
    }

    public function test_admin_can_delete_custom_role(): void
    {
        $role = Role::create(['name' => 'temporary_role', 'guard_name' => 'api']);

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/admin/roles/{$role->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);
        $this->assertDatabaseMissing('roles', ['name' => 'temporary_role']);
    }

    public function test_cannot_delete_protected_roles(): void
    {
        $role = Role::findByName('admin', 'api');

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/admin/roles/{$role->id}");

        $response->assertUnprocessable()
            ->assertJsonPath('success', false);
    }

    public function test_cannot_delete_role_with_users(): void
    {
        $role = Role::create(['name' => 'in_use_role', 'guard_name' => 'api']);
        $user = User::factory()->create();
        $user->assignRole('in_use_role');

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/admin/roles/{$role->id}");

        $response->assertUnprocessable();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Permissions — Lecture
    // ══════════════════════════════════════════════════════════════════════════

    public function test_admin_can_list_permissions(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/permissions');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [['id', 'name']], 'grouped']);
    }

    public function test_permissions_are_grouped_by_category(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/permissions');

        $response->assertOk();
        $grouped = $response->json('grouped');
        $this->assertArrayHasKey('patients', $grouped);
        $this->assertArrayHasKey('consultations', $grouped);
        $this->assertArrayHasKey('admin', $grouped);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Attribution rôles utilisateur
    // ══════════════════════════════════════════════════════════════════════════

    public function test_admin_can_get_user_roles(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/v1/admin/users/{$this->doctor->id}/roles");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['user', 'roles', 'permissions']]);

        $this->assertContains('doctor', $response->json('data.roles'));
    }

    public function test_admin_can_assign_roles_to_user(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/admin/users/{$this->patient->id}/roles", [
                'roles' => ['patient', 'health_professional'],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->patient->refresh();
        $this->assertTrue($this->patient->hasRole('patient'));
        $this->assertTrue($this->patient->hasRole('health_professional'));
    }

    public function test_assign_role_syncs_replaces_previous(): void
    {
        $this->assertTrue($this->doctor->hasRole('doctor'));

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/admin/users/{$this->doctor->id}/roles", [
                'roles' => ['specialist'],
            ]);

        $this->doctor->refresh();
        $this->assertFalse($this->doctor->hasRole('doctor'));
        $this->assertTrue($this->doctor->hasRole('specialist'));
    }

    public function test_assign_invalid_role_fails(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/admin/users/{$this->patient->id}/roles", [
                'roles' => ['nonexistent_role'],
            ]);

        $response->assertUnprocessable();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Matrice rôles × permissions
    // ══════════════════════════════════════════════════════════════════════════

    public function test_admin_can_get_roles_matrix(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/roles-matrix');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [
                'roles' => [['role', 'permissions']],
                'permissions',
            ]]);
    }

    public function test_matrix_shows_all_roles(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/roles-matrix');

        $roleNames = collect($response->json('data.roles'))->pluck('role')->toArray();
        $this->assertContains('admin', $roleNames);
        $this->assertContains('doctor', $roleNames);
        $this->assertContains('patient', $roleNames);
    }

    public function test_matrix_admin_has_all_permissions(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/roles-matrix');

        $allPerms = $response->json('data.permissions');
        $adminRole = collect($response->json('data.roles'))->firstWhere('role', 'admin');

        $this->assertNotNull($adminRole);
        $this->assertEqualsCanonicalizing($allPerms, $adminRole['permissions']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Sécurité — Accès non autorisé
    // ══════════════════════════════════════════════════════════════════════════

    public function test_patient_cannot_access_roles(): void
    {
        $response = $this->actingAs($this->patient, 'api')
            ->getJson('/api/v1/admin/roles');

        $response->assertForbidden();
    }

    public function test_patient_cannot_assign_roles(): void
    {
        $response = $this->actingAs($this->patient, 'api')
            ->postJson("/api/v1/admin/users/{$this->patient->id}/roles", [
                'roles' => ['admin'],
            ]);

        $response->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_roles(): void
    {
        $response = $this->getJson('/api/v1/admin/roles');

        $response->assertUnauthorized();
    }
}
