<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConsultationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected Patient $patient;
    protected DossierPatient $dossier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->patient = Patient::factory()->create();
        $this->dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);
    }

    public function test_doctor_can_list_consultations(): void
    {
        Consultation::factory()->count(2)->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/consultations');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_doctor_can_start_consultation_from_appointment(): void
    {
        $rdv = RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/appointments/{$rdv->id}/start");

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('consultations', [
            'rendez_vous_id' => $rdv->id,
            'statut' => 'en_cours',
        ]);
    }

    public function test_doctor_can_end_consultation(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'statut' => 'en_cours',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/end");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('consultations', [
            'id' => $consultation->id,
            'statut' => 'terminee',
        ]);
    }

    public function test_doctor_can_create_report(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/report", [
                'title' => 'Compte rendu',
                'content' => 'Le patient présente...',
                'follow_up_instructions' => 'Revenir dans 2 semaines',
                'structured_data' => [
                    'chief_complaint' => 'Céphalées',
                    'diagnosis' => 'Migraine',
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_doctor_can_sign_report(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'observation' => json_encode(['title' => 'Test report']),
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/report/sign");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Rapport signé électroniquement');
    }

    public function test_sign_report_fails_without_report(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'observation' => null,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/report/sign");

        $response->assertStatus(422);
    }

    public function test_doctor_can_record_medical_parameters(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/medical-parameters", [
                'poids' => 72.5,
                'taille' => 175,
                'temperature' => 37.2,
                'tension_systolique' => 120,
                'tension_diastolique' => 80,
                'frequence_cardiaque' => 75,
                'saturation_o2' => 98,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('constantes', [
            'dossier_patient_id' => $this->dossier->id,
            'poids' => 72.5,
        ]);
    }

    public function test_dashboard_returns_stats(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/consultations/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => ['stats', 'health_indicators', 'ehealth_indicators'],
            ]);
    }

    public function test_other_doctor_cannot_access_consultation(): void
    {
        $otherDoctor = User::factory()->doctor()->create(['status' => 'actif']);
        $otherDoctor->assignRole('doctor');

        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($otherDoctor, 'api')
            ->getJson("/api/v1/consultations/{$consultation->id}");

        $response->assertStatus(403);
    }
}
