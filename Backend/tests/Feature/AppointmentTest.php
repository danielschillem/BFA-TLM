<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $patientUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->patientUser = User::factory()->create(['status' => 'actif']);
        $this->patientUser->assignRole('patient');
    }

    public function test_doctor_can_list_appointments(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/appointments');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_patient_can_create_appointment(): void
    {
        // Créer un acte et un profil Patient lié au user
        $acte = \App\Models\Acte::factory()->create();
        $patient = \App\Models\Patient::factory()->create(['user_id' => $this->patientUser->id]);

        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson('/api/v1/appointments', [
                'type' => 'teleconsultation',
                'motif' => 'Consultation de routine',
                'date' => now()->addDays(3)->format('Y-m-d'),
                'heure' => '10:00',
                'patient_id' => $patient->id,
                'user_id' => $this->doctor->id,
                'acte_ids' => [$acte->id],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_doctor_can_confirm_appointment(): void
    {
        $patient = Patient::factory()->create();
        $rdv = RendezVous::factory()->create([
            'patient_id' => $patient->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/appointments/{$rdv->id}/confirm");

        $response->assertOk();
        $this->assertDatabaseHas('rendez_vous', [
            'id' => $rdv->id,
            'statut' => 'confirme',
        ]);
    }

    public function test_doctor_can_cancel_appointment(): void
    {
        $patient = Patient::factory()->create();
        $rdv = RendezVous::factory()->create([
            'patient_id' => $patient->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/appointments/{$rdv->id}/cancel", [
                'reason' => 'Indisponibilité du médecin',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('rendez_vous', [
            'id' => $rdv->id,
            'statut' => 'annule',
        ]);
    }

    public function test_doctor_can_delegate_appointment(): void
    {
        $otherDoctor = User::factory()->doctor()->create(['status' => 'actif']);
        $otherDoctor->assignRole('doctor');

        $patient = Patient::factory()->create();
        $rdv = RendezVous::factory()->create([
            'patient_id' => $patient->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/appointments/{$rdv->id}/delegate", [
                'delegate_to' => $otherDoctor->id,
                'reason' => 'Transfert de patient',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('rendez_vous', [
            'id' => $rdv->id,
            'user_id' => $otherDoctor->id,
        ]);
    }
}
