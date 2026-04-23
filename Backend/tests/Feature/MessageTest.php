<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageTest extends TestCase
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
        Patient::factory()->create(['user_id' => $this->patientUser->id]);
    }

    public function test_inbox_returns_messages(): void
    {
        Message::create([
            'contenu' => 'Bonjour docteur',
            'sender_id' => $this->patientUser->id,
            'recipient_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/messages/inbox');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_unread_count(): void
    {
        Message::create([
            'contenu' => 'Message non lu',
            'sender_id' => $this->patientUser->id,
            'recipient_id' => $this->doctor->id,
            'lu' => false,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/messages/unread');

        $response->assertOk();
    }

    public function test_send_message(): void
    {
        $patient = $this->patientUser->patient;
        RendezVous::factory()->create([
            'patient_id' => $patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/messages', [
                'recipient_id' => $this->patientUser->id,
                'body' => 'Prenez votre traitement',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('messages', [
            'sender_id' => $this->doctor->id,
            'recipient_id' => $this->patientUser->id,
        ]);
    }

    public function test_send_message_validates_recipient(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/messages', [
                'body' => 'Test sans destinataire',
            ]);

        $response->assertStatus(422);
    }

    public function test_conversation(): void
    {
        $patient = $this->patientUser->patient;
        RendezVous::factory()->create([
            'patient_id' => $patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
        ]);

        Message::create([
            'contenu' => 'Bonjour',
            'sender_id' => $this->doctor->id,
            'recipient_id' => $this->patientUser->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/messages/conversation/{$this->patientUser->id}");

        $response->assertOk();
    }

    public function test_inbox_requires_auth(): void
    {
        $this->getJson('/api/v1/messages/inbox')->assertStatus(401);
    }

    public function test_doctor_cannot_send_message_to_unrelated_patient(): void
    {
        $unrelatedPatientUser = User::factory()->create(['status' => 'actif']);
        $unrelatedPatientUser->assignRole('patient');
        Patient::factory()->create(['user_id' => $unrelatedPatientUser->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/messages', [
                'recipient_id' => $unrelatedPatientUser->id,
                'body' => 'Message non autorisé',
            ]);

        $response->assertStatus(403);
    }

    public function test_doctor_can_send_message_to_related_patient(): void
    {
        $patient = $this->patientUser->patient;
        RendezVous::factory()->create([
            'patient_id' => $patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/messages', [
                'recipient_id' => $this->patientUser->id,
                'body' => 'Rappel de suivi',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }
}
