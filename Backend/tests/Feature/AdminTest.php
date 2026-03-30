<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Paiement;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    public function test_admin_can_access_dashboard(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/dashboard');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'total_users',
                    'active_doctors',
                    'total_patients',
                    'health_indicators',
                    'ehealth_indicators',
                ],
            ]);
    }

    public function test_non_admin_cannot_access_dashboard(): void
    {
        $doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $doctor->assignRole('doctor');

        $response = $this->actingAs($doctor, 'api')
            ->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(403);
    }

    // ── User Management ───────────────────────────────────────────────────────

    public function test_admin_can_list_users(): void
    {
        User::factory()->count(3)->create(['status' => 'actif']);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/users');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_admin_can_search_users(): void
    {
        User::factory()->create(['nom' => 'SAWADOGO', 'status' => 'actif']);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/users?search=SAWA');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }

    public function test_admin_can_filter_users_by_role(): void
    {
        $doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $doctor->assignRole('doctor');

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/users?role=doctor');

        $response->assertOk();
    }

    public function test_admin_can_update_user_status(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('doctor');

        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/v1/admin/users/{$user->id}/status", [
                'status' => 'suspendu',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => 'suspendu',
        ]);
    }

    public function test_admin_can_update_user_status_with_english_name(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('doctor');

        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/v1/admin/users/{$user->id}/status", [
                'status' => 'suspended',
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => 'suspendu',
        ]);
    }

    public function test_admin_can_verify_doctor(): void
    {
        $doctor = User::factory()->doctor()->create(['status' => 'inactif']);
        $doctor->assignRole('doctor');

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/admin/users/{$doctor->id}/verify");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('users', [
            'id' => $doctor->id,
            'status' => 'actif',
        ]);
    }

    // ── Non-admin access control ──────────────────────────────────────────────

    public function test_doctor_cannot_list_users(): void
    {
        $doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $doctor->assignRole('doctor');

        $response = $this->actingAs($doctor, 'api')
            ->getJson('/api/v1/admin/users');

        $response->assertStatus(403);
    }

    public function test_patient_cannot_access_admin_routes(): void
    {
        $patient = User::factory()->create(['status' => 'actif']);
        $patient->assignRole('patient');

        $response = $this->actingAs($patient, 'api')
            ->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(403);
    }
}
