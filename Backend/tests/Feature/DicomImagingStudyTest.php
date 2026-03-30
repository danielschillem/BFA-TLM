<?php

namespace Tests\Feature;

use App\Models\DicomStudy;
use App\Models\Patient;
use App\Models\User;
use App\Services\DicomService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DicomImagingStudyTest extends TestCase
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

    // ═══════════════════════════════════════════════════════════════════════════
    //  DICOM — Health Check
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_dicom_health_check(): void
    {
        $this->mock(DicomService::class, function ($mock) {
            $mock->shouldReceive('healthCheck')
                ->once()
                ->andReturn(['status' => 'ok', 'pacs' => 'dcm4chee-arc']);
        });

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dicom/health');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'ok');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  DICOM — CRUD local
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_dicom_index_requires_auth(): void
    {
        $response = $this->getJson('/api/v1/dicom/studies');
        $response->assertUnauthorized();
    }

    public function test_dicom_index_lists_studies(): void
    {
        $patient = Patient::factory()->create();
        DicomStudy::factory()->count(3)->create(['patient_id' => $patient->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dicom/studies');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data.data');
    }

    public function test_dicom_index_filters_by_patient(): void
    {
        $patient1 = Patient::factory()->create();
        $patient2 = Patient::factory()->create();
        DicomStudy::factory()->count(2)->create(['patient_id' => $patient1->id]);
        DicomStudy::factory()->create(['patient_id' => $patient2->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dicom/studies?patient_id=' . $patient1->id);

        $response->assertOk()
            ->assertJsonCount(2, 'data.data');
    }

    public function test_dicom_index_filters_by_modality(): void
    {
        $patient = Patient::factory()->create();
        DicomStudy::factory()->create(['patient_id' => $patient->id, 'modality' => 'CT']);
        DicomStudy::factory()->create(['patient_id' => $patient->id, 'modality' => 'MR']);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dicom/studies?modality=CT');

        $response->assertOk()
            ->assertJsonCount(1, 'data.data');
    }

    public function test_dicom_show_returns_study(): void
    {
        $study = DicomStudy::factory()->create();

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dicom/studies/' . $study->id);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $study->id)
            ->assertJsonPath('data.study_instance_uid', $study->study_instance_uid)
            ->assertJsonPath('data.modality', $study->modality);
    }

    public function test_dicom_show_returns_404_for_missing(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/dicom/studies/9999');

        $response->assertNotFound();
    }

    public function test_dicom_store_creates_study(): void
    {
        $patient = Patient::factory()->create();

        $payload = [
            'study_instance_uid' => '1.2.826.9999.1234.5678',
            'study_description' => 'Scanner thoracique',
            'modality' => 'CT',
            'body_part_examined' => 'CHEST',
            'study_date' => '2025-06-01',
            'patient_id' => $patient->id,
        ];

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/dicom/studies', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.modality', 'CT')
            ->assertJsonPath('data.study_instance_uid', '1.2.826.9999.1234.5678');

        $this->assertDatabaseHas('dicom_studies', [
            'study_instance_uid' => '1.2.826.9999.1234.5678',
            'modality' => 'CT',
            'patient_id' => $patient->id,
            'uploaded_by' => $this->doctor->id,
        ]);
    }

    public function test_dicom_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/dicom/studies', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['study_instance_uid', 'modality', 'patient_id']);
    }

    public function test_dicom_update_changes_status(): void
    {
        $study = DicomStudy::factory()->create(['statut' => 'recu']);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson('/api/v1/dicom/studies/' . $study->id, [
                'statut' => 'lu',
                'interpretation' => 'Pas d\'anomalie détectée.',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.statut', 'lu');

        $this->assertDatabaseHas('dicom_studies', [
            'id' => $study->id,
            'statut' => 'lu',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FHIR ImagingStudy
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_fhir_imaging_study_search_returns_bundle(): void
    {
        DicomStudy::factory()->count(2)->create();

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy');

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle')
            ->assertJsonPath('type', 'searchset')
            ->assertJsonPath('total', 2);
    }

    public function test_fhir_imaging_study_search_filters_by_patient(): void
    {
        $patient = Patient::factory()->create();
        DicomStudy::factory()->count(2)->create(['patient_id' => $patient->id]);
        DicomStudy::factory()->create(); // other patient

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy?patient=Patient/' . $patient->id);

        $response->assertOk()
            ->assertJsonPath('resourceType', 'Bundle')
            ->assertJsonPath('total', 2);
    }

    public function test_fhir_imaging_study_search_filters_by_modality(): void
    {
        DicomStudy::factory()->create(['modality' => 'MR']);
        DicomStudy::factory()->create(['modality' => 'CT']);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy?modality=MR');

        $response->assertOk()
            ->assertJsonPath('total', 1);
    }

    public function test_fhir_imaging_study_read_returns_resource(): void
    {
        $study = DicomStudy::factory()->create([
            'modality' => 'CT',
            'study_description' => 'Scanner cérébral',
            'statut' => 'lu',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy/' . $study->id);

        $response->assertOk()
            ->assertJsonPath('resourceType', 'ImagingStudy')
            ->assertJsonPath('id', (string) $study->id)
            ->assertJsonPath('description', 'Scanner cérébral')
            ->assertJsonPath('modality.0.code', 'CT')
            ->assertJsonPath('modality.0.system', 'http://dicom.nema.org/resources/ontology/DCM');
    }

    public function test_fhir_imaging_study_read_contains_dicom_uid_identifier(): void
    {
        $study = DicomStudy::factory()->create([
            'study_instance_uid' => '1.2.826.0001.9999',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy/' . $study->id);

        $response->assertOk()
            ->assertJsonPath('identifier.0.system', 'urn:dicom:uid')
            ->assertJsonPath('identifier.0.value', 'urn:oid:1.2.826.0001.9999');
    }

    public function test_fhir_imaging_study_read_contains_subject_reference(): void
    {
        $patient = Patient::factory()->create();
        $study = DicomStudy::factory()->create(['patient_id' => $patient->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy/' . $study->id);

        $response->assertOk()
            ->assertJsonPath('subject.reference', 'Patient/' . $patient->id);
    }

    public function test_fhir_imaging_study_read_404_for_missing(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy/99999');

        $response->assertNotFound();
    }

    public function test_fhir_imaging_study_read_includes_endpoint(): void
    {
        $study = DicomStudy::factory()->create();

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/fhir/ImagingStudy/' . $study->id);

        $response->assertOk();

        $data = $response->json();
        $this->assertArrayHasKey('endpoint', $data);
        $this->assertNotEmpty($data['endpoint']);
    }
}
