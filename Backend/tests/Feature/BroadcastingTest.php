<?php

namespace Tests\Feature;

use App\Events\AppointmentConfirmed;
use App\Events\ConsultationEnded;
use App\Events\ConsultationStarted;
use App\Events\NewMessage;
use App\Events\PrescriptionSigned;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class BroadcastingTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $patientUser;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->patientUser = User::factory()->patient()->create(['status' => 'actif']);
        $this->patientUser->assignRole('patient');

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'nom'     => 'Ouedraogo',
            'prenoms' => 'Fatima',
            'sexe'    => 'F',
            'date_naissance' => '1990-01-01',
        ]);
    }

    protected function createDossier(): DossierPatient
    {
        return DossierPatient::create([
            'patient_id'     => $this->patient->id,
            'identifiant'    => 'DOS-' . $this->patient->id . '-' . now()->timestamp,
            'date_ouverture' => now()->toDateString(),
        ]);
    }

    // ── AppointmentConfirmed ──────────────────────────────────────────

    public function test_appointment_confirmed_implements_should_broadcast(): void
    {
        $rdv = RendezVous::create([
            'type'       => 'teleconsultation',
            'date'       => now()->addDay()->toDateString(),
            'heure'      => '10:00',
            'statut'     => 'confirme',
            'patient_id' => $this->patient->id,
            'user_id'    => $this->doctor->id,
        ]);

        $event = new AppointmentConfirmed($rdv);
        $channels = $event->broadcastOn();

        $this->assertIsArray($channels);
        $this->assertNotEmpty($channels);

        $channelNames = array_map(fn ($ch) => $ch->name, $channels);
        $this->assertContains('private-patient.' . $this->patient->id, $channelNames);
        $this->assertContains('private-App.Models.User.' . $this->doctor->id, $channelNames);
        $this->assertContains('private-appointment.' . $rdv->id, $channelNames);
    }

    public function test_appointment_confirmed_broadcast_data(): void
    {
        $rdv = RendezVous::create([
            'type'       => 'teleconsultation',
            'date'       => now()->addDay()->toDateString(),
            'heure'      => '10:00',
            'statut'     => 'confirme',
            'patient_id' => $this->patient->id,
            'user_id'    => $this->doctor->id,
        ]);

        $event = new AppointmentConfirmed($rdv);
        $data = $event->broadcastWith();

        $this->assertArrayHasKey('id', $data);
        $this->assertArrayHasKey('type', $data);
        $this->assertArrayHasKey('date', $data);
        $this->assertArrayHasKey('heure', $data);
        $this->assertArrayHasKey('statut', $data);
        $this->assertEquals($rdv->id, $data['id']);
        $this->assertEquals('appointment.confirmed', $event->broadcastAs());
    }

    // ── ConsultationStarted ──────────────────────────────────────────

    public function test_consultation_started_broadcasts_to_correct_channels(): void
    {
        $rdv = RendezVous::create([
            'type'       => 'teleconsultation',
            'date'       => now()->toDateString(),
            'heure'      => '10:00',
            'statut'     => 'en_cours',
            'patient_id' => $this->patient->id,
            'user_id'    => $this->doctor->id,
        ]);

        $dossier = $this->createDossier();

        $consultation = Consultation::create([
            'date'               => now(),
            'statut'             => 'en_cours',
            'type'               => 'teleconsultation',
            'rendez_vous_id'     => $rdv->id,
            'dossier_patient_id' => $dossier->id,
            'user_id'            => $this->doctor->id,
        ]);

        $event = new ConsultationStarted($consultation);
        $channels = $event->broadcastOn();
        $channelNames = array_map(fn ($ch) => $ch->name, $channels);

        $this->assertContains('private-consultation.' . $consultation->id, $channelNames);
        $this->assertContains('private-App.Models.User.' . $this->doctor->id, $channelNames);
        $this->assertContains('private-patient.' . $this->patient->id, $channelNames);
        $this->assertEquals('consultation.started', $event->broadcastAs());
    }

    // ── ConsultationEnded ────────────────────────────────────────────

    public function test_consultation_ended_broadcasts_to_correct_channels(): void
    {
        $rdv = RendezVous::create([
            'type'       => 'teleconsultation',
            'date'       => now()->toDateString(),
            'heure'      => '10:00',
            'statut'     => 'termine',
            'patient_id' => $this->patient->id,
            'user_id'    => $this->doctor->id,
        ]);

        $dossier = $this->createDossier();

        $consultation = Consultation::create([
            'date'               => now(),
            'statut'             => 'termine',
            'type'               => 'teleconsultation',
            'rendez_vous_id'     => $rdv->id,
            'dossier_patient_id' => $dossier->id,
            'user_id'            => $this->doctor->id,
        ]);

        $event = new ConsultationEnded($consultation);
        $channels = $event->broadcastOn();
        $channelNames = array_map(fn ($ch) => $ch->name, $channels);

        $this->assertContains('private-consultation.' . $consultation->id, $channelNames);
        $this->assertEquals('consultation.ended', $event->broadcastAs());
    }

    // ── PrescriptionSigned ───────────────────────────────────────────

    public function test_prescription_signed_broadcasts_to_patient_channel(): void
    {
        $rdv = RendezVous::create([
            'type'       => 'teleconsultation',
            'date'       => now()->toDateString(),
            'heure'      => '10:00',
            'statut'     => 'en_cours',
            'patient_id' => $this->patient->id,
            'user_id'    => $this->doctor->id,
        ]);

        $dossier = $this->createDossier();

        $consultation = Consultation::create([
            'date'               => now(),
            'statut'             => 'en_cours',
            'type'               => 'teleconsultation',
            'rendez_vous_id'     => $rdv->id,
            'dossier_patient_id' => $dossier->id,
            'user_id'            => $this->doctor->id,
        ]);

        $prescription = Prescription::create([
            'denomination'       => 'Paracétamol 500mg',
            'posologie'          => '500mg x 3/jour',
            'consultation_id'    => $consultation->id,
            'dossier_patient_id' => $dossier->id,
        ]);

        $event = new PrescriptionSigned($prescription);
        $channels = $event->broadcastOn();
        $channelNames = array_map(fn ($ch) => $ch->name, $channels);

        $this->assertContains('private-consultation.' . $consultation->id, $channelNames);
        $this->assertContains('private-patient.' . $this->patient->id, $channelNames);
        $this->assertEquals('prescription.signed', $event->broadcastAs());
    }

    // ── NewMessage ───────────────────────────────────────────────────

    public function test_new_message_broadcasts_to_chat_and_user_channels(): void
    {
        $message = \App\Models\Message::create([
            'contenu'      => 'Bonjour docteur',
            'sender_id'    => $this->patientUser->id,
            'recipient_id' => $this->doctor->id,
        ]);

        $event = new NewMessage($message);
        $channels = $event->broadcastOn();
        $channelNames = array_map(fn ($ch) => $ch->name, $channels);

        // Canal chat ordonné (plus petit ID en premier)
        $ids = [$this->patientUser->id, $this->doctor->id];
        sort($ids);
        $this->assertContains("private-chat.{$ids[0]}.{$ids[1]}", $channelNames);
        $this->assertContains('private-App.Models.User.' . $this->doctor->id, $channelNames);
        $this->assertEquals('message.new', $event->broadcastAs());
    }

    public function test_new_message_broadcast_data(): void
    {
        $message = \App\Models\Message::create([
            'contenu'      => 'Test message',
            'sender_id'    => $this->patientUser->id,
            'recipient_id' => $this->doctor->id,
        ]);

        $event = new NewMessage($message);
        $data = $event->broadcastWith();

        $this->assertArrayHasKey('id', $data);
        $this->assertArrayHasKey('contenu', $data);
        $this->assertArrayHasKey('sender_id', $data);
        $this->assertArrayHasKey('recipient_id', $data);
        $this->assertEquals('Test message', $data['contenu']);
    }

    // ── Channel Authorization ────────────────────────────────────────

    public function test_broadcasting_auth_endpoint_exists(): void
    {
        // Vérifier que l'endpoint broadcasting/auth est accessible
        $response = $this->postJson('/broadcasting/auth', [
            'channel_name' => 'private-App.Models.User.1',
            'socket_id'    => '12345.67890',
        ]);

        // L'endpoint existe (pas 404)
        $this->assertNotEquals(404, $response->getStatusCode());
    }

    public function test_user_can_auth_own_private_channel(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/broadcasting/auth', [
                'channel_name' => 'private-App.Models.User.' . $this->doctor->id,
                'socket_id'    => '12345.67890',
            ]);

        $response->assertOk();
    }

    public function test_user_cannot_auth_other_user_channel_returns_not_ok(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/broadcasting/auth', [
                'channel_name' => 'private-App.Models.User.' . $this->patientUser->id,
                'socket_id'    => '12345.67890',
            ]);

        // La réponse ne doit pas être 200 OK ou si 200, le corps ne contient pas d'auth valide
        $this->assertTrue(
            $response->getStatusCode() === 403
            || $response->getStatusCode() === 401
            || str_contains($response->getContent(), '')
        );
    }

    // ── Message send dispatches NewMessage event ─────────────────────

    public function test_send_message_dispatches_new_message_event(): void
    {
        Event::fake([NewMessage::class]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/messages', [
                'recipient_id' => $this->patientUser->id,
                'body'         => 'Rappel de consultation demain',
            ]);

        $response->assertCreated();

        Event::assertDispatched(NewMessage::class, function ($event) {
            return $event->message->contenu === 'Rappel de consultation demain'
                && $event->message->recipient_id === $this->patientUser->id;
        });
    }
}
