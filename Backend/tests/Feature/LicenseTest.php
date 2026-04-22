<?php

namespace Tests\Feature;

use App\Models\License;
use App\Models\LicenseModule;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\LicenseModuleSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LicenseTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $doctor;
    protected Structure $structure;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->seed(LicenseModuleSeeder::class);

        $this->structure = Structure::factory()->create();

        $this->admin = User::factory()->create(['status' => 'actif', 'structure_id' => $this->structure->id]);
        $this->admin->assignRole('admin');

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif', 'structure_id' => $this->structure->id]);
        $this->doctor->assignRole('doctor');
    }

    // ── Public routes ─────────────────────────────────────────────────────

    public function test_grille_tarifaire_is_public(): void
    {
        $response = $this->getJson('/api/v1/licenses/grille');
        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_modules_list_is_public(): void
    {
        $response = $this->getJson('/api/v1/licenses/modules');
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_simuler_returns_cost_estimate(): void
    {
        $response = $this->postJson('/api/v1/licenses/simuler', [
            'type_centre' => 'CMA',
            'capacite_lits' => 50,
            'max_utilisateurs' => 20,
            'nombre_sites' => 1,
            'modules' => [],
        ]);

        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_simuler_validates_type_centre(): void
    {
        $response = $this->postJson('/api/v1/licenses/simuler', [
            'capacite_lits' => 10,
        ]);

        $response->assertStatus(422);
    }

    // ── Authenticated routes ──────────────────────────────────────────────

    public function test_creer_demo_requires_auth(): void
    {
        $response = $this->postJson('/api/v1/licenses/demo', [
            'structure_id' => $this->structure->id,
        ]);

        $response->assertUnauthorized();
    }

    public function test_creer_demo_creates_trial_license(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/licenses/demo', [
                'structure_id' => $this->structure->id,
            ]);

        $response->assertStatus(201)->assertJsonPath('success', true);
        $this->assertDatabaseHas('licenses', [
            'structure_id' => $this->structure->id,
            'type' => 'demo',
            'statut' => 'active',
        ]);
    }

    public function test_creer_demo_prevents_duplicate(): void
    {
        License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $this->structure->id,
            'type' => 'demo',
            'statut' => 'active',
            'type_centre' => 'CSPS',
            'date_debut' => now(),
            'date_fin' => now()->addDays(14),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/licenses/demo', [
                'structure_id' => $this->structure->id,
            ]);

        $response->assertStatus(422);
    }

    public function test_verifier_license_returns_status(): void
    {
        License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $this->structure->id,
            'type' => 'annuelle',
            'statut' => 'active',
            'type_centre' => 'CMA',
            'date_debut' => now()->subMonth(),
            'date_fin' => now()->addMonths(11),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/v1/licenses/verifier/{$this->structure->id}");

        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_show_license(): void
    {
        $license = License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $this->structure->id,
            'type' => 'annuelle',
            'statut' => 'active',
            'type_centre' => 'CHU',
            'date_debut' => now(),
            'date_fin' => now()->addYear(),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/v1/licenses/{$license->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.est_active', true);
    }

    public function test_par_structure_returns_licenses(): void
    {
        License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $this->structure->id,
            'type' => 'annuelle',
            'statut' => 'active',
            'type_centre' => 'CMA',
            'date_debut' => now(),
            'date_fin' => now()->addYear(),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/v1/licenses/structure/{$this->structure->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    // ── Admin-only routes ─────────────────────────────────────────────────

    public function test_store_license_requires_admin(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/licenses', [
                'structure_id' => $this->structure->id,
                'type_centre' => 'CMA',
                'max_utilisateurs' => 20,
            ]);

        $response->assertForbidden();
    }

    public function test_admin_can_create_annual_license(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/v1/licenses', [
                'structure_id' => $this->structure->id,
                'type_centre' => 'CMA',
                'capacite_lits' => 30,
                'max_utilisateurs' => 15,
                'nombre_sites' => 1,
                'modules' => [],
            ]);

        $response->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_admin_can_suspend_license(): void
    {
        $license = License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $this->structure->id,
            'type' => 'annuelle',
            'statut' => 'active',
            'type_centre' => 'CHR',
            'date_debut' => now(),
            'date_fin' => now()->addYear(),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/v1/licenses/{$license->id}/suspendre");

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('licenses', ['id' => $license->id, 'statut' => 'suspendue']);
    }

    public function test_admin_can_renew_license(): void
    {
        $license = License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $this->structure->id,
            'type' => 'annuelle',
            'statut' => 'active',
            'type_centre' => 'CMA',
            'date_debut' => now()->subYear(),
            'date_fin' => now()->addDays(10),
            'montant_total_fcfa' => 500000,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/licenses/{$license->id}/renouveler");

        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_cannot_renew_demo_license(): void
    {
        $license = License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $this->structure->id,
            'type' => 'demo',
            'statut' => 'active',
            'type_centre' => 'CSPS',
            'date_debut' => now(),
            'date_fin' => now()->addDays(14),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/licenses/{$license->id}/renouveler");

        $response->assertStatus(422);
    }

    public function test_statistiques_requires_admin(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/licenses/statistiques');

        $response->assertForbidden();
    }

    public function test_admin_can_view_statistiques(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/licenses/statistiques');

        $response->assertOk()->assertJsonPath('success', true);
    }

    // ── IDOR checks ───────────────────────────────────────────────────────

    public function test_doctor_cannot_access_other_structure_license(): void
    {
        $otherStructure = Structure::factory()->create();
        $license = License::create([
            'license_key' => bin2hex(random_bytes(32)),
            'structure_id' => $otherStructure->id,
            'type' => 'annuelle',
            'statut' => 'active',
            'type_centre' => 'CHU',
            'date_debut' => now(),
            'date_fin' => now()->addYear(),
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/licenses/{$license->id}");

        $response->assertForbidden();
    }
}
