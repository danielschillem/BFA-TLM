<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditTest extends TestCase
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

    public function test_my_logs(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/audit/my-logs');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_full_audit_requires_admin_permission(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/audit/logs');

        $response->assertStatus(403);
    }

    public function test_admin_can_view_audit_logs(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/audit/logs');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_can_view_audit_report(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/audit/report');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_audit_requires_auth(): void
    {
        $this->getJson('/api/v1/audit/my-logs')->assertStatus(401);
    }
}
