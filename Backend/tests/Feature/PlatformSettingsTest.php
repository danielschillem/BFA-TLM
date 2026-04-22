<?php

namespace Tests\Feature;

use App\Models\PlatformSetting;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $doctor;
    protected User $patientUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->patientUser = User::factory()->create(['status' => 'actif']);
        $this->patientUser->assignRole('patient');
    }

    // ── Public settings ───────────────────────────────────────────────────

    public function test_public_settings_returns_fee_info(): void
    {
        $response = $this->actingAs($this->patientUser, 'api')
            ->getJson('/api/v1/payments/settings');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'data' => ['platform_fee', 'mobile_money_rate']]);
    }

    // ── Admin index ───────────────────────────────────────────────────────

    public function test_index_requires_admin(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/admin/settings');

        $response->assertForbidden();
    }

    public function test_admin_can_list_all_settings(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/admin/settings');

        $response->assertOk()->assertJsonPath('success', true);
    }

    // ── Admin update ──────────────────────────────────────────────────────

    public function test_admin_can_update_setting(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->putJson('/api/v1/admin/settings/platform_fee', [
                'value' => 750,
            ]);

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertEquals(750, PlatformSetting::getValue('platform_fee'));
    }

    public function test_update_nonexistent_setting_returns_404(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->putJson('/api/v1/admin/settings/nonexistent_key', [
                'value' => 'anything',
            ]);

        $response->assertStatus(404);
    }

    public function test_update_validates_value_required(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->putJson('/api/v1/admin/settings/platform_fee', []);

        $response->assertStatus(422);
    }

    // ── Admin batch update ────────────────────────────────────────────────

    public function test_admin_can_batch_update_settings(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->putJson('/api/v1/admin/settings', [
                'settings' => [
                    ['key' => 'platform_fee', 'value' => 1000],
                    ['key' => 'mobile_money_rate', 'value' => 2.0],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertEquals(1000, PlatformSetting::getValue('platform_fee'));
    }

    public function test_batch_update_validates_structure(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->putJson('/api/v1/admin/settings', [
                'settings' => 'not_an_array',
            ]);

        $response->assertStatus(422);
    }

    // ── Authorization ─────────────────────────────────────────────────────

    public function test_patient_cannot_access_admin_settings(): void
    {
        $response = $this->actingAs($this->patientUser, 'api')
            ->getJson('/api/v1/admin/settings');

        $response->assertForbidden();
    }

    public function test_doctor_cannot_update_settings(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->putJson('/api/v1/admin/settings/platform_fee', [
                'value' => 999,
            ]);

        $response->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_admin_settings(): void
    {
        $response = $this->getJson('/api/v1/admin/settings');
        $response->assertUnauthorized();
    }
}
