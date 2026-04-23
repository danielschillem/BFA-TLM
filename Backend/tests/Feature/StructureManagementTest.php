<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\Structure;
use App\Models\TypeStructure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StructureManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $doctor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');
    }

    // ── TypeStructure CRUD ──────────────────────────────────────

    public function test_admin_can_list_type_structures(): void
    {
        TypeStructure::create(['libelle' => 'CHU', 'actif' => true]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/type-structures');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_can_create_type_structure(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/admin/type-structures', [
                'libelle' => 'CMA',
                'description' => 'Centre médical avec antenne chirurgicale',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('type_structures', ['libelle' => 'CMA']);
    }

    public function test_admin_can_update_type_structure(): void
    {
        $type = TypeStructure::create(['libelle' => 'CSPS']);

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/v1/admin/type-structures/{$type->id}", [
                'libelle' => 'CSPS Urbain',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('type_structures', ['id' => $type->id, 'libelle' => 'CSPS Urbain']);
    }

    public function test_admin_can_delete_type_structure_without_structures(): void
    {
        $type = TypeStructure::create(['libelle' => 'Dispensaire']);

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/admin/type-structures/{$type->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('type_structures', ['id' => $type->id]);
    }

    public function test_cannot_delete_type_structure_with_structures(): void
    {
        $type = TypeStructure::create(['libelle' => 'CHU']);
        Structure::factory()->create(['type_structure_id' => $type->id]);

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/admin/type-structures/{$type->id}");

        $response->assertStatus(422);
    }

    public function test_doctor_cannot_access_type_structures(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/admin/type-structures');

        $response->assertStatus(403);
    }

    // ── Structure CRUD ──────────────────────────────────────────

    public function test_admin_can_list_structures(): void
    {
        Structure::factory()->create();

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/structures');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_can_create_structure(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/admin/structures', [
                'libelle' => 'CMA Secteur 15',
                'telephone' => '+226 25 36 47 58',
                'email' => 'cma15@test.bf',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('structures', ['libelle' => 'CMA Secteur 15']);
    }

    public function test_admin_can_update_structure(): void
    {
        $structure = Structure::factory()->create();

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/v1/admin/structures/{$structure->id}", [
                'libelle' => 'Structure Modifiée',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_cannot_delete_structure_with_users(): void
    {
        $structure = Structure::factory()->create();
        User::factory()->create(['structure_id' => $structure->id]);

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/admin/structures/{$structure->id}");

        $response->assertStatus(422);
    }

    // ── Services d'une structure ────────────────────────────────

    public function test_admin_can_list_services(): void
    {
        $structure = Structure::factory()->create();
        Service::create([
            'libelle' => 'Cardiologie',
            'code' => 'CARDIO-TEST',
            'structure_id' => $structure->id,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/v1/admin/structures/{$structure->id}/services");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_can_create_service(): void
    {
        $structure = Structure::factory()->create();

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/admin/structures/{$structure->id}/services", [
                'libelle' => 'Pédiatrie',
                'code' => 'PEDIA-NEW',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('services', [
            'code' => 'PEDIA-NEW',
            'structure_id' => $structure->id,
        ]);
    }

    public function test_cannot_delete_service_with_users(): void
    {
        $structure = Structure::factory()->create();
        $service = Service::create([
            'libelle' => 'Médecine',
            'code' => 'MED-DEL',
            'structure_id' => $structure->id,
        ]);
        User::factory()->create([
            'structure_id' => $structure->id,
            'service_id' => $service->id,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/admin/structures/{$structure->id}/services/{$service->id}");

        $response->assertStatus(422);
    }

    // ── Gestionnaires ───────────────────────────────────────────

    public function test_admin_can_list_gestionnaires(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/gestionnaires');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_can_create_gestionnaire(): void
    {
        $structure = Structure::factory()->create();

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/admin/gestionnaires', [
                'nom' => 'Ouédraogo',
                'prenoms' => 'Fatimata',
                'email' => 'fatimata@test.bf',
                'password' => 'SecureP@ss1',
                'sexe' => 'F',
                'structure_id' => $structure->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('users', [
            'email' => 'fatimata@test.bf',
        ]);

        $user = User::where('email', 'fatimata@test.bf')->first();
        $this->assertTrue($user->hasRole('structure_manager'));
    }

    public function test_doctor_cannot_create_gestionnaire(): void
    {
        $structure = Structure::factory()->create();

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/admin/gestionnaires', [
                'nom' => 'Test',
                'prenoms' => 'Test',
                'email' => 'test@test.bf',
                'password' => 'SecureP@ss1',
                'sexe' => 'M',
                'structure_id' => $structure->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_cannot_access_admin(): void
    {
        $response = $this->getJson('/api/v1/admin/structures');
        $response->assertStatus(401);
    }
}
