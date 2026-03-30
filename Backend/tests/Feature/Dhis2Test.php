<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\Structure;
use App\Models\Localite;
use App\Models\User;
use App\Services\Dhis2Service;
use App\Services\EndosService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class Dhis2Test extends TestCase
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

    // ── Service tests ─────────────────────────────────────────────────────────

    public function test_dhis2_service_collects_tlm_indicators(): void
    {
        $patient = Patient::factory()->create();
        $dossier = DossierPatient::factory()->create([
            'patient_id' => $patient->id,
            'identifiant' => 'DP-TEST-001',
            'date_ouverture' => now(),
        ]);

        Consultation::factory()->count(3)->create([
            'dossier_patient_id' => $dossier->id,
            'user_id' => $this->doctor->id,
            'statut' => 'terminee',
            'date' => now(),
        ]);
        Consultation::factory()->create([
            'dossier_patient_id' => $dossier->id,
            'user_id' => $this->doctor->id,
            'statut' => 'en_cours',
            'date' => now(),
        ]);

        $service = new Dhis2Service();
        $indicators = $service->collectTlmIndicators(now()->format('Ym'));

        $this->assertEquals(4, $indicators['total_consultations']);
        $this->assertEquals(3, $indicators['completed_consultations']);
        $this->assertEquals(75.0, $indicators['completion_rate']);
        $this->assertArrayHasKey('period', $indicators);
        $this->assertArrayHasKey('period_start', $indicators);
    }

    public function test_dhis2_service_builds_data_values(): void
    {
        $service = new Dhis2Service([
            'base_url' => 'https://test.dhis2.org',
            'api_version' => '2.40',
            'data_elements' => [
                'total_consultations' => 'UID_CONSULT',
                'completion_rate' => 'UID_COMP_RATE',
                'e_prescriptions' => null, // not mapped
            ],
        ]);

        $dataValues = $service->buildTlmDataValues('OU_123', '202603', [
            'total_consultations' => 42,
            'completion_rate' => 87.5,
            'e_prescriptions' => 10,
        ]);

        // Only mapped elements should be included
        $this->assertCount(2, $dataValues);
        $this->assertEquals('UID_CONSULT', $dataValues[0]['dataElement']);
        $this->assertEquals('42', $dataValues[0]['value']);
        $this->assertEquals('202603', $dataValues[0]['period']);
        $this->assertEquals('OU_123', $dataValues[0]['orgUnit']);
    }

    public function test_dhis2_health_check_succeeds_with_fake_server(): void
    {
        Http::fake([
            '*/api/2.40/system/info' => Http::response([
                'version' => '2.40.2',
                'revision' => 'abc123',
                'serverDate' => '2026-03-26T12:00:00.000',
                'contextPath' => 'https://dhis2.sante.gov.bf',
            ], 200),
        ]);

        $service = new Dhis2Service([
            'base_url' => 'https://dhis2.sante.gov.bf',
            'api_version' => '2.40',
            'username' => 'test',
            'password' => 'test',
        ]);

        $result = $service->healthCheck();

        $this->assertEquals('online', $result['status']);
        $this->assertEquals('2.40.2', $result['version']);
    }

    public function test_dhis2_health_check_returns_offline_on_failure(): void
    {
        Http::fake([
            '*/api/2.40/system/info' => Http::response(null, 500),
        ]);

        $service = new Dhis2Service([
            'base_url' => 'https://dhis2.sante.gov.bf',
            'api_version' => '2.40',
        ]);

        $result = $service->healthCheck();

        $this->assertEquals('error', $result['status']);
    }

    public function test_dhis2_push_data_values_succeeds(): void
    {
        Http::fake([
            '*/api/2.40/dataValueSets' => Http::response([
                'status' => 'SUCCESS',
                'importCount' => [
                    'imported' => 5,
                    'updated' => 0,
                    'ignored' => 0,
                    'deleted' => 0,
                ],
            ], 200),
        ]);

        $service = new Dhis2Service([
            'base_url' => 'https://dhis2.sante.gov.bf',
            'api_version' => '2.40',
            'username' => 'test',
            'password' => 'test',
        ]);

        $result = $service->pushDataValues([
            ['dataElement' => 'DE1', 'period' => '202603', 'orgUnit' => 'OU1', 'value' => '42'],
        ]);

        $this->assertEquals('SUCCESS', $result['status']);
        $this->assertEquals(5, $result['importCount']['imported']);
    }

    public function test_dhis2_org_unit_search(): void
    {
        Http::fake([
            '*/api/2.40/organisationUnits*' => Http::response([
                'organisationUnits' => [
                    ['id' => 'OU_001', 'displayName' => 'CHU Yalgado', 'level' => 3],
                    ['id' => 'OU_002', 'displayName' => 'CHU Bogodogo', 'level' => 3],
                ],
            ], 200),
        ]);

        $service = new Dhis2Service([
            'base_url' => 'https://dhis2.sante.gov.bf',
            'api_version' => '2.40',
            'username' => 'test',
            'password' => 'test',
        ]);

        $results = $service->searchOrganisationUnits('CHU');

        $this->assertCount(2, $results);
        $this->assertEquals('CHU Yalgado', $results[0]['displayName']);
    }

    // ── ENDOS Service tests ──────────────────────────────────────────────────

    public function test_endos_disabled_by_default(): void
    {
        $endos = new EndosService();
        $this->assertFalse($endos->isEnabled());

        $result = $endos->healthCheck();
        $this->assertEquals('disabled', $result['status']);
    }

    public function test_endos_push_returns_disabled_when_not_enabled(): void
    {
        $endos = new EndosService();
        $result = $endos->pushIndicators('202603');

        $this->assertEquals('disabled', $result['status']);
    }

    // ── API route tests ──────────────────────────────────────────────────────

    public function test_dhis2_metadata_endpoint_is_public(): void
    {
        Http::fake([
            '*/api/2.40/system/info' => Http::response(['version' => '2.40.2'], 200),
        ]);

        $response = $this->getJson('/api/v1/dhis2/metadata');

        $response->assertOk()
            ->assertJsonStructure(['success', 'data' => ['dhis2', 'endos']]);
    }

    public function test_dhis2_indicators_requires_auth(): void
    {
        $response = $this->getJson('/api/v1/dhis2/indicators');

        $response->assertUnauthorized();
    }

    public function test_dhis2_indicators_returns_data(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dhis2/indicators?period=202603');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => ['total_consultations', 'completion_rate', 'period'],
            ]);
    }

    public function test_dhis2_push_requires_admin(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/dhis2/push', [
                'org_unit' => 'OU_123',
                'period' => '202603',
            ]);

        $response->assertForbidden();
    }

    public function test_dhis2_mapping_config_endpoint(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dhis2/mapping');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => ['dataset_uid', 'data_elements', 'mapped_count', 'unmapped_count'],
            ]);
    }

    public function test_endos_health_endpoint(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dhis2/endos/health');

        $response->assertOk()
            ->assertJsonPath('data.status', 'disabled');
    }

    public function test_endos_push_requires_admin(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/dhis2/endos/push');

        $response->assertForbidden();
    }
}
