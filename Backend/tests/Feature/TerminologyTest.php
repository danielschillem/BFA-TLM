<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TerminologyTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');
    }

    // ── Terminology Metadata (public) ─────────────────────────────────────────

    public function test_terminology_metadata_is_public(): void
    {
        $response = $this->getJson('/api/v1/terminology/metadata');

        $response->assertOk()
            ->assertJsonStructure(['service', 'version', 'terminologies']);
    }

    // ── ATC ───────────────────────────────────────────────────────────────────

    public function test_atc_tree_returns_classification(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/tree');

        $response->assertOk()
            ->assertJsonStructure([['code', 'display']]);
    }

    public function test_atc_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/search?term=paracetamol');

        $response->assertOk()
            ->assertJsonStructure(['items', 'total']);
    }

    public function test_atc_search_requires_query(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/search');

        $response->assertStatus(422);
    }

    public function test_atc_lookup_valid_code(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/lookup/N02BE01');

        $response->assertOk()
            ->assertJsonStructure(['code', 'display', 'level']);
    }

    public function test_atc_lookup_invalid_code(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/lookup/ZZZZZZ');

        $response->assertStatus(404);
    }

    public function test_atc_children(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/children/N');

        $response->assertOk()
            ->assertJsonStructure([['code', 'display']]);
    }

    public function test_atc_validate_valid_code(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/validate/N02BE01');

        $response->assertOk()
            ->assertJsonPath('valid', true);
    }

    public function test_atc_validate_invalid_code(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/terminology/atc/validate/INVALID');

        $response->assertOk()
            ->assertJsonPath('valid', false);
    }

    // ── ATC requires auth ─────────────────────────────────────────────────────

    public function test_atc_tree_requires_auth(): void
    {
        $response = $this->getJson('/api/v1/terminology/atc/tree');

        $response->assertStatus(401);
    }

    // ── SNOMED CT Health (public) ─────────────────────────────────────────────

    public function test_snomed_health_is_public(): void
    {
        $response = $this->getJson('/api/v1/terminology/snomed/health');

        $response->assertOk()
            ->assertJsonStructure(['status', 'server']);
    }

    // ── SNOMED CT requires auth ───────────────────────────────────────────────

    public function test_snomed_search_requires_auth(): void
    {
        $response = $this->getJson('/api/v1/terminology/snomed/search?q=headache');

        $response->assertStatus(401);
    }

    // ── ICD-11 ────────────────────────────────────────────────────────────────

    public function test_icd11_health_is_public(): void
    {
        $response = $this->getJson('/api/v1/icd11/health');

        $response->assertOk();
    }

    public function test_icd11_search_requires_auth(): void
    {
        $response = $this->getJson('/api/v1/icd11/search?q=malaria');

        $response->assertStatus(401);
    }
}
