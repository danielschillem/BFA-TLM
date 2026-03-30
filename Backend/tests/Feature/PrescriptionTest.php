<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrescriptionTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected Consultation $consultation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $patient = Patient::factory()->create();
        $dossier = DossierPatient::factory()->create(['patient_id' => $patient->id]);
        $this->consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $dossier->id,
        ]);
    }

    public function test_doctor_can_create_prescription(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$this->consultation->id}/prescriptions", [
                'denomination' => 'Amoxicilline',
                'posologie' => '500mg 3x/jour',
                'instructions' => 'Pendant les repas',
                'duree_jours' => 7,
                'urgent' => false,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('prescriptions', [
            'denomination' => 'Amoxicilline',
            'consultation_id' => $this->consultation->id,
        ]);
    }

    public function test_doctor_can_sign_prescription(): void
    {
        $prescription = Prescription::factory()->create([
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->consultation->dossier_patient_id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/prescriptions/{$prescription->id}/sign");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('prescriptions', [
            'id' => $prescription->id,
            'signee' => true,
        ]);
    }

    public function test_other_doctor_cannot_sign_prescription(): void
    {
        $otherDoctor = User::factory()->doctor()->create(['status' => 'actif']);
        $otherDoctor->assignRole('doctor');

        $prescription = Prescription::factory()->create([
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->consultation->dossier_patient_id,
        ]);

        $response = $this->actingAs($otherDoctor, 'api')
            ->postJson("/api/v1/prescriptions/{$prescription->id}/sign");

        $response->assertStatus(403);
    }

    public function test_share_requires_signed_prescription(): void
    {
        $prescription = Prescription::factory()->create([
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->consultation->dossier_patient_id,
            'signee' => false,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/prescriptions/{$prescription->id}/share");

        $response->assertStatus(422);
    }

    public function test_doctor_can_list_prescriptions(): void
    {
        Prescription::factory()->count(3)->create([
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->consultation->dossier_patient_id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/prescriptions');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }
}
