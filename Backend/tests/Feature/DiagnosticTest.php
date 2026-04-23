<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Diagnostic;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiagnosticTest extends TestCase
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

    public function test_doctor_can_create_diagnostic(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/diagnostics', [
                'libelle' => 'Paludisme simple',
                'type' => 'principal',
                'gravite' => 'moderee',
                'statut' => 'confirme',
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('diagnostics', [
            'libelle' => 'Paludisme simple',
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);
    }

    public function test_store_resolves_dossier_from_consultation(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/diagnostics', [
                'libelle' => 'Anémie',
                'type' => 'secondaire',
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('diagnostics', [
            'libelle' => 'Anémie',
            'dossier_patient_id' => $this->dossier->id,
        ]);
    }

    public function test_unauthenticated_cannot_create_diagnostic(): void
    {
        $response = $this->postJson('/api/v1/diagnostics', [
            'libelle' => 'Test',
            'consultation_id' => $this->consultation->id,
        ]);

        $response->assertStatus(401);
    }

    public function test_patient_cannot_create_diagnostic(): void
    {
        $response = $this->actingAs($this->patient, 'api')
            ->postJson('/api/v1/diagnostics', [
                'libelle' => 'Test',
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_doctor_without_relation_cannot_create_diagnostic(): void
    {
        $otherDoctor = User::factory()->doctor()->create([
            'status' => 'actif',
            'structure_id' => $this->structure->id,
        ]);
        $otherDoctor->assignRole('doctor');

        $response = $this->actingAs($otherDoctor, 'api')
            ->postJson('/api/v1/diagnostics', [
                'libelle' => 'Test IDOR',
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_doctor_can_update_diagnostic(): void
    {
        $diagnostic = Diagnostic::create([
            'libelle' => 'Paludisme',
            'type' => 'principal',
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/diagnostics/{$diagnostic->id}", [
                'libelle' => 'Paludisme grave',
                'gravite' => 'severe',
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('diagnostics', [
            'id' => $diagnostic->id,
            'libelle' => 'Paludisme grave',
        ]);
    }

    public function test_doctor_can_delete_diagnostic(): void
    {
        $diagnostic = Diagnostic::create([
            'libelle' => 'Diagnostic à supprimer',
            'type' => 'principal',
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->deleteJson("/api/v1/diagnostics/{$diagnostic->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('diagnostics', ['id' => $diagnostic->id]);
    }

    public function test_validation_requires_libelle_and_consultation(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/diagnostics', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['libelle', 'consultation_id']);
    }

    public function test_validation_rejects_invalid_gravite(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/diagnostics', [
                'libelle' => 'Test',
                'gravite' => 'inconnue',
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['gravite']);
    }
}
