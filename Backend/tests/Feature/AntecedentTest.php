<?php

namespace Tests\Feature;

use App\Models\Antecedent;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AntecedentTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $patient;
    protected Structure $structure;
    protected DossierPatient $dossier;
    protected Consultation $consultation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->structure = Structure::factory()->create();

        $this->doctor = User::factory()->doctor()->create([
            'status' => 'actif',
            'structure_id' => $this->structure->id,
        ]);
        $this->doctor->assignRole('doctor');

        $patientModel = Patient::factory()->create([
            'structure_id' => $this->structure->id,
        ]);
        $this->dossier = DossierPatient::factory()->create([
            'patient_id' => $patientModel->id,
            'structure_id' => $this->structure->id,
        ]);

        $this->consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        RendezVous::factory()->create([
            'user_id' => $this->doctor->id,
            'patient_id' => $patientModel->id,
            'dossier_patient_id' => $this->dossier->id,
            'structure_id' => $this->structure->id,
        ]);

        $this->patient = User::factory()->patient()->create(['status' => 'actif']);
        $this->patient->assignRole('patient');
    }

    public function test_doctor_can_create_antecedent(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/antecedents', [
                'libelle' => 'Diabète type 2',
                'type' => 'medical',
                'description' => 'Diagnostiqué en 2018',
                'dossier_patient_id' => $this->dossier->id,
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('antecedents', [
            'libelle' => 'Diabète type 2',
            'type' => 'medical',
            'dossier_patient_id' => $this->dossier->id,
            'user_id' => $this->doctor->id,
        ]);
    }

    public function test_unauthenticated_cannot_create_antecedent(): void
    {
        $response = $this->postJson('/api/v1/antecedents', [
            'libelle' => 'HTA',
            'type' => 'medical',
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response->assertStatus(401);
    }

    public function test_patient_cannot_create_antecedent(): void
    {
        $response = $this->actingAs($this->patient, 'api')
            ->postJson('/api/v1/antecedents', [
                'libelle' => 'HTA',
                'type' => 'medical',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_doctor_without_relation_cannot_create_antecedent(): void
    {
        $otherDoctor = User::factory()->doctor()->create([
            'status' => 'actif',
            'structure_id' => $this->structure->id,
        ]);
        $otherDoctor->assignRole('doctor');

        $response = $this->actingAs($otherDoctor, 'api')
            ->postJson('/api/v1/antecedents', [
                'libelle' => 'Appendicectomie',
                'type' => 'chirurgical',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_doctor_can_update_antecedent(): void
    {
        $antecedent = Antecedent::create([
            'libelle' => 'HTA',
            'type' => 'medical',
            'dossier_patient_id' => $this->dossier->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/antecedents/{$antecedent->id}", [
                'libelle' => 'Hypertension artérielle',
                'type' => 'medical',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('antecedents', [
            'id' => $antecedent->id,
            'libelle' => 'Hypertension artérielle',
        ]);
    }

    public function test_doctor_can_delete_antecedent(): void
    {
        $antecedent = Antecedent::create([
            'libelle' => 'Appendicectomie',
            'type' => 'chirurgical',
            'dossier_patient_id' => $this->dossier->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->deleteJson("/api/v1/antecedents/{$antecedent->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('antecedents', ['id' => $antecedent->id]);
    }

    public function test_validation_requires_libelle_and_type(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/antecedents', [
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['libelle', 'type']);
    }

    public function test_validation_rejects_invalid_type(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/antecedents', [
                'libelle' => 'Test',
                'type' => 'invalide',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }
}
