<?php

namespace Tests\Feature;

use App\Models\Allergie;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AllergieTest extends TestCase
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

        // Créer un RDV pour autoriser la relation médecin-patient
        RendezVous::factory()->create([
            'user_id' => $this->doctor->id,
            'patient_id' => $patientModel->id,
            'dossier_patient_id' => $this->dossier->id,
            'structure_id' => $this->structure->id,
        ]);

        $this->patient = User::factory()->patient()->create(['status' => 'actif']);
        $this->patient->assignRole('patient');
    }

    public function test_doctor_can_create_allergie(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/allergies', [
                'allergenes' => 'Pénicilline',
                'manifestations' => 'Urticaire',
                'severite' => 'moderee',
                'dossier_patient_id' => $this->dossier->id,
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('allergies', [
            'allergenes' => 'Pénicilline',
            'dossier_patient_id' => $this->dossier->id,
        ]);
    }

    public function test_unauthenticated_cannot_create_allergie(): void
    {
        $response = $this->postJson('/api/v1/allergies', [
            'allergenes' => 'Pénicilline',
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response->assertStatus(401);
    }

    public function test_patient_cannot_create_allergie(): void
    {
        $response = $this->actingAs($this->patient, 'api')
            ->postJson('/api/v1/allergies', [
                'allergenes' => 'Pénicilline',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_doctor_without_relation_cannot_create_allergie(): void
    {
        $otherDoctor = User::factory()->doctor()->create([
            'status' => 'actif',
            'structure_id' => $this->structure->id,
        ]);
        $otherDoctor->assignRole('doctor');

        $response = $this->actingAs($otherDoctor, 'api')
            ->postJson('/api/v1/allergies', [
                'allergenes' => 'Latex',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_doctor_can_update_allergie(): void
    {
        $allergie = Allergie::create([
            'allergenes' => 'Pénicilline',
            'severite' => 'legere',
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/allergies/{$allergie->id}", [
                'allergenes' => 'Amoxicilline',
                'severite' => 'severe',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('allergies', [
            'id' => $allergie->id,
            'allergenes' => 'Amoxicilline',
        ]);
    }

    public function test_doctor_can_delete_allergie(): void
    {
        $allergie = Allergie::create([
            'allergenes' => 'Latex',
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->deleteJson("/api/v1/allergies/{$allergie->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('allergies', ['id' => $allergie->id]);
    }

    public function test_validation_requires_allergenes(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/allergies', [
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['allergenes']);
    }

    public function test_validation_rejects_invalid_severite(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/allergies', [
                'allergenes' => 'Pollen',
                'severite' => 'inconnue',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['severite']);
    }
}
