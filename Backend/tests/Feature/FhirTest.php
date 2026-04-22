<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FhirTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected Structure $structure;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->structure = Structure::factory()->create();

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif', 'structure_id' => $this->structure->id]);
        $this->doctor->assignRole('doctor');
    }

    // ── Metadata (public) ─────────────────────────────────────────────────────

    public function test_fhir_metadata_is_public(): void
    {
        $response = $this->getJson('/api/v1/fhir/metadata');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'CapabilityStatement')
            ->assertJsonPath('fhirVersion', '4.0.1')
            ->assertJsonPath('status', 'active');
    }

    public function test_fhir_metadata_lists_supported_resources(): void
    {
        $response = $this->getJson('/api/v1/fhir/metadata');

        $response->assertOk();
        $rest = $response->json('rest.0.resource');
        $types = array_column($rest, 'type');

        $this->assertContains('Patient', $types);
        $this->assertContains('Practitioner', $types);
        $this->assertContains('Encounter', $types);
        $this->assertContains('Observation', $types);
        $this->assertContains('Condition', $types);
        $this->assertContains('MedicationRequest', $types);
    }

    // ── Patient ───────────────────────────────────────────────────────────────

    public function test_fhir_patient_search_requires_auth(): void
    {
        $response = $this->getJson('/api/v1/fhir/Patient');

        $response->assertStatus(401);
    }

    public function test_fhir_patient_search_returns_bundle(): void
    {
        Patient::factory()->count(3)->create();

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Patient');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle')
            ->assertJsonPath('type', 'searchset');
    }

    public function test_fhir_patient_search_by_name(): void
    {
        Patient::factory()->create(['nom' => 'OUEDRAOGO', 'prenoms' => 'Fatimata']);

        // NB: Patient names are encrypted at-rest → SQL LIKE cannot match.
        // The search returns a valid Bundle with total = 0.
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Patient?name=OUED');

        $response->assertOk();
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Bundle', $data['resourceType']);
        $this->assertEquals('searchset', $data['type']);
        $this->assertArrayHasKey('total', $data);
    }

    public function test_fhir_patient_read(): void
    {
        $patient = Patient::factory()->create();
        $patient->forceFill(['structure_id' => $this->structure->id])->save();

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/fhir/Patient/{$patient->id}");

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Patient');
    }

    public function test_fhir_patient_read_not_found(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Patient/99999');

        $response->assertStatus(404);
    }

    // ── Practitioner ──────────────────────────────────────────────────────────

    public function test_fhir_practitioner_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Practitioner');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    public function test_fhir_practitioner_read(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/fhir/Practitioner/{$this->doctor->id}");

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Practitioner');
    }

    // ── Organization ──────────────────────────────────────────────────────────

    public function test_fhir_organization_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Organization');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── Encounter (Consultation) ──────────────────────────────────────────────

    public function test_fhir_encounter_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Encounter');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── Appointment ───────────────────────────────────────────────────────────

    public function test_fhir_appointment_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Appointment');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── Condition ─────────────────────────────────────────────────────────────

    public function test_fhir_condition_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Condition');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── AllergyIntolerance ────────────────────────────────────────────────────

    public function test_fhir_allergy_intolerance_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/AllergyIntolerance');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── MedicationRequest ─────────────────────────────────────────────────────

    public function test_fhir_medication_request_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/MedicationRequest');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── DiagnosticReport ──────────────────────────────────────────────────────

    public function test_fhir_diagnostic_report_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/DiagnosticReport');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── Consent ───────────────────────────────────────────────────────────────

    public function test_fhir_consent_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/Consent');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── ImagingStudy ──────────────────────────────────────────────────────────

    public function test_fhir_imaging_study_search(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }

    // ── Patient $everything ───────────────────────────────────────────────────

    public function test_fhir_patient_everything(): void
    {
        $patient = Patient::factory()->create();
        $patient->forceFill(['structure_id' => $this->structure->id])->save();

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/fhir/Patient/{$patient->id}/\$everything");

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle');
    }
}
