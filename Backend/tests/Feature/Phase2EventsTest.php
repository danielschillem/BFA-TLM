<?php

namespace Tests\Feature;

use App\Events\AppointmentConfirmed;
use App\Events\ConsultationEnded;
use App\Events\ConsultationStarted;
use App\Events\PrescriptionSigned;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Phase2EventsTest extends TestCase
{
    use RefreshDatabase;

    private User $doctor;
    private User $patientUser;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->create();
        $this->doctor->assignRole('doctor');

        $this->patientUser = User::factory()->create();
        $this->patientUser->assignRole('patient');

        $this->patient = Patient::factory()->create(['user_id' => $this->patientUser->id]);
    }

    public function test_confirm_appointment_dispatches_event(): void
    {
        Event::fake([AppointmentConfirmed::class]);

        $rdv = RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'planifie',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/appointments/{$rdv->id}/confirm");

        $response->assertOk()
            ->assertJsonPath('success', true);

        Event::assertDispatched(AppointmentConfirmed::class, function ($event) use ($rdv) {
            return $event->rendezVous->id === $rdv->id;
        });
    }

    public function test_end_consultation_dispatches_event(): void
    {
        Event::fake([ConsultationEnded::class]);

        $dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $dossier->id,
            'statut' => 'en_cours',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/end");

        $response->assertOk()
            ->assertJsonPath('success', true);

        Event::assertDispatched(ConsultationEnded::class, function ($event) use ($consultation) {
            return $event->consultation->id === $consultation->id;
        });
    }

    public function test_sign_prescription_dispatches_event(): void
    {
        Event::fake([PrescriptionSigned::class]);

        $dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $dossier->id,
        ]);
        $prescription = Prescription::factory()->create([
            'consultation_id' => $consultation->id,
            'dossier_patient_id' => $dossier->id,
            'signee' => false,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/prescriptions/{$prescription->id}/sign");

        $response->assertOk()
            ->assertJsonPath('success', true);

        Event::assertDispatched(PrescriptionSigned::class, function ($event) use ($prescription) {
            return $event->prescription->id === $prescription->id;
        });
    }

    public function test_event_listeners_are_registered(): void
    {
        $events = app()->make('events');

        // Verify all 4 events have listeners
        $this->assertTrue($events->hasListeners(AppointmentConfirmed::class));
        $this->assertTrue($events->hasListeners(ConsultationStarted::class));
        $this->assertTrue($events->hasListeners(ConsultationEnded::class));
        $this->assertTrue($events->hasListeners(PrescriptionSigned::class));
    }
}
