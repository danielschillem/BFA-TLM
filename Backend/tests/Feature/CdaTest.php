<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CdaTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected Patient $patient;
    protected DossierPatient $dossier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $structure = Structure::factory()->create();

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif', 'structure_id' => $structure->id]);
        $this->doctor->assignRole('doctor');

        $this->patient = Patient::factory()->create();
        $this->patient->forceFill(['structure_id' => $structure->id])->save();
        $this->dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);
    }

    // ── Metadata (public) ─────────────────────────────────────────────────────

    public function test_cda_metadata_is_public(): void
    {
        $response = $this->getJson('/api/v1/cda/metadata');

        $response->assertOk()
            ->assertJsonPath('service', 'TLM-BFA CDA R2 Document Service')
            ->assertJsonPath('standard', 'HL7 CDA® Release 2.0');
    }

    public function test_cda_metadata_lists_supported_document_types(): void
    {
        $response = $this->getJson('/api/v1/cda/metadata');

        $response->assertOk()
            ->assertJsonStructure(['supported_documents']);

        $types = array_column($response->json('supported_documents'), 'type');
        $this->assertContains('CCD', $types);
        $this->assertContains('Consultation Note', $types);
    }

    // ── Patient CCD ───────────────────────────────────────────────────────────

    public function test_cda_patient_ccd_requires_auth(): void
    {
        $response = $this->getJson("/api/v1/cda/Patient/{$this->patient->id}/ccd");

        $response->assertStatus(401);
    }

    public function test_cda_patient_ccd_returns_xml(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->get("/api/v1/cda/Patient/{$this->patient->id}/ccd");

        $response->assertOk();
        $this->assertStringContainsString('xml', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('ClinicalDocument', $response->getContent());
    }

    public function test_cda_patient_ccd_not_found(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/cda/Patient/99999/ccd');

        $response->assertStatus(404);
    }

    // ── Patient Summary ───────────────────────────────────────────────────────

    public function test_cda_patient_summary_returns_xml(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->get("/api/v1/cda/Patient/{$this->patient->id}/summary");

        $response->assertOk();
        $this->assertStringContainsString('ClinicalDocument', $response->getContent());
    }

    // ── Consultation Note ─────────────────────────────────────────────────────

    public function test_cda_consultation_note_returns_xml(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->get("/api/v1/cda/Consultation/{$consultation->id}/note");

        $response->assertOk();
        $this->assertStringContainsString('ClinicalDocument', $response->getContent());
    }

    public function test_cda_consultation_note_not_found(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/cda/Consultation/99999/note');

        $response->assertStatus(404);
    }

    // ── CDA Validation ────────────────────────────────────────────────────────

    public function test_cda_validate_valid_document(): void
    {
        // Generate a real CDA document first
        $response = $this->actingAs($this->doctor, 'api')
            ->get("/api/v1/cda/Patient/{$this->patient->id}/ccd");

        $xml = $response->getContent();

        $validateResponse = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/cda/validate', ['document' => $xml]);

        $validateResponse->assertOk()
            ->assertJsonPath('valid', true);
    }

    public function test_cda_validate_malformed_xml(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/cda/validate', [
                'document' => '<not-valid-xml><unclosed>',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_cda_validate_non_cda_xml(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/cda/validate', [
                'document' => '<?xml version="1.0"?><root><child>test</child></root>',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_cda_validate_requires_document_field(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/cda/validate', []);

        $response->assertStatus(422);
    }
}
