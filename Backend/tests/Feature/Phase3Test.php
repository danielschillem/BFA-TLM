<?php

namespace Tests\Feature;

use App\Console\Commands\SendAppointmentReminders;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use App\Notifications\AppointmentReminderNotification;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class Phase3Test extends TestCase
{
    use RefreshDatabase;

    private User $doctor;
    private User $doctor2;
    private User $patientUser;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->create();
        $this->doctor->assignRole('doctor');

        $this->doctor2 = User::factory()->create();
        $this->doctor2->assignRole('doctor');

        $this->patientUser = User::factory()->create();
        $this->patientUser->assignRole('patient');

        $this->patient = Patient::factory()->create(['user_id' => $this->patientUser->id]);
    }

    // ── Notifications API ─────────────────────────────────────────────────────

    public function test_authenticated_user_can_list_notifications(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/notifications');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta' => ['unread_count']]);
    }

    public function test_authenticated_user_can_get_unread_count(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/notifications/unread-count');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.unread_count', 0);
    }

    public function test_mark_all_notifications_as_read(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/notifications/read-all');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    // ── Délégation de rendez-vous ─────────────────────────────────────────────

    public function test_doctor_can_delegate_appointment(): void
    {
        $rdv = RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/appointments/{$rdv->id}/delegate", [
                'delegate_to' => $this->doctor2->id,
                'reason' => 'Indisponible',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('rendez_vous', [
            'id' => $rdv->id,
            'user_id' => $this->doctor2->id,
        ]);
    }

    public function test_delegate_requires_valid_doctor(): void
    {
        $rdv = RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/appointments/{$rdv->id}/delegate", [
                'delegate_to' => 99999,
            ]);

        $response->assertStatus(422);
    }

    // ── Rappels de rendez-vous ────────────────────────────────────────────────

    public function test_reminder_command_sends_notifications_for_tomorrow(): void
    {
        Notification::fake();

        RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
            'date' => now()->addDay()->toDateString(),
        ]);

        $this->artisan('appointments:send-reminders')
            ->assertSuccessful();

        Notification::assertSentTo($this->patientUser, AppointmentReminderNotification::class);
        Notification::assertSentTo($this->doctor, AppointmentReminderNotification::class);
    }

    public function test_reminder_command_ignores_cancelled_appointments(): void
    {
        Notification::fake();

        RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'annule',
            'date' => now()->addDay()->toDateString(),
        ]);

        $this->artisan('appointments:send-reminders')
            ->assertSuccessful();

        Notification::assertNothingSent();
    }

    public function test_reminder_command_ignores_past_appointments(): void
    {
        Notification::fake();

        RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'statut' => 'confirme',
            'date' => now()->subDay()->toDateString(),
        ]);

        $this->artisan('appointments:send-reminders')
            ->assertSuccessful();

        Notification::assertNothingSent();
    }
}
