<?php

namespace Tests\Feature;

use App\Events\ConsultationEnded;
use App\Events\ConsultationStarted;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class VideoConsultationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $patientUser;
    protected Patient $patient;
    protected DossierPatient $dossier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->patientUser = User::factory()->create(['status' => 'actif']);
        $this->patientUser->assignRole('patient');

        $this->patient = Patient::factory()->create(['user_id' => $this->patientUser->id]);
        $this->dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);
    }

    // ── Jitsi room name generation ─────────────────────────────────────────────

    public function test_teleconsultation_start_generates_room_name(): void
    {
        $rdv = RendezVous::factory()->teleconsultation()->confirmed()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/appointments/{$rdv->id}/start");

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $rdv->refresh();
        $this->assertNotNull($rdv->room_name, 'Le room_name Jitsi doit être généré');
        $this->assertStringStartsWith('tlm-', $rdv->room_name);
    }

    public function test_presentiel_consultation_does_not_generate_room_name(): void
    {
        $rdv = RendezVous::factory()->confirmed()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'type' => 'presentiel',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/appointments/{$rdv->id}/start");

        $response->assertStatus(201);

        $rdv->refresh();
        $this->assertNull($rdv->room_name, 'Une consultation présentielle ne doit pas avoir de room_name');
    }

    public function test_teleconsultation_preserves_existing_room_name(): void
    {
        $rdv = RendezVous::factory()->teleconsultation()->confirmed()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'room_name' => 'tlm-existing-room',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/appointments/{$rdv->id}/start");

        $response->assertStatus(201);

        $rdv->refresh();
        $this->assertEquals('tlm-existing-room', $rdv->room_name);
    }

    public function test_consultation_resource_includes_jitsi_room_name(): void
    {
        $rdv = RendezVous::factory()->teleconsultation()->confirmed()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
            'room_name' => 'tlm-42-abc123',
        ]);

        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'rendez_vous_id' => $rdv->id,
            'type' => 'teleconsultation',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/consultations/{$consultation->id}");

        $response->assertOk()
            ->assertJsonPath('data.jitsi_room_name', 'tlm-42-abc123')
            ->assertJsonPath('data.type', 'teleconsultation');
    }

    // ── Video quality rating ───────────────────────────────────────────────────

    public function test_doctor_can_rate_video_quality(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'type' => 'teleconsultation',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
                'rating' => 4,
                'comment' => 'Bonne qualité vidéo, léger délai audio',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Évaluation enregistrée');

        $this->assertDatabaseHas('consultations', [
            'id' => $consultation->id,
            'video_rating' => 4,
            'video_rating_comment' => 'Bonne qualité vidéo, léger délai audio',
            'video_rated_by' => $this->doctor->id,
        ]);
    }

    public function test_rate_video_requires_rating(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('rating');
    }

    public function test_rate_video_rejects_invalid_rating(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
                'rating' => 6,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('rating');
    }

    public function test_rate_video_rejects_zero_rating(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
                'rating' => 0,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('rating');
    }

    public function test_rate_video_accepts_minimum_rating(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
                'rating' => 1,
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('consultations', [
            'id' => $consultation->id,
            'video_rating' => 1,
        ]);
    }

    public function test_rate_video_without_comment(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
                'rating' => 5,
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('consultations', [
            'id' => $consultation->id,
            'video_rating' => 5,
            'video_rating_comment' => null,
        ]);
    }

    public function test_rate_video_rejects_long_comment(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
                'rating' => 3,
                'comment' => str_repeat('x', 501),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('comment');
    }

    // ── Teleconsultation consent ───────────────────────────────────────────────

    public function test_consent_can_be_recorded_for_teleconsultation(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'type' => 'teleconsultation',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/consent", [
                'accepted' => true,
                'type' => 'teleconsultation',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('patient_consents', [
            'patient_id' => $this->patient->id,
            'type' => 'teleconsultation',
            'accepted' => true,
        ]);
    }

    public function test_consent_refused_returns_422(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'type' => 'teleconsultation',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/consent", [
                'accepted' => false,
                'type' => 'teleconsultation',
            ]);

        $response->assertStatus(422);
    }

    public function test_consent_with_proxy(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'type' => 'teleconsultation',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/consent", [
                'accepted' => true,
                'type' => 'teleconsultation',
                'is_proxy' => true,
                'proxy_nom' => 'Ouédraogo Aminata',
                'proxy_lien' => 'Mère',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('patient_consents', [
            'patient_id' => $this->patient->id,
            'is_proxy' => true,
            'proxy_nom' => 'Ouédraogo Aminata',
            'proxy_lien' => 'Mère',
        ]);
    }

    // ── Events ─────────────────────────────────────────────────────────────────

    public function test_start_teleconsultation_dispatches_event(): void
    {
        Event::fake([ConsultationStarted::class]);

        $rdv = RendezVous::factory()->teleconsultation()->confirmed()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/appointments/{$rdv->id}/start");

        $response->assertStatus(201);

        Event::assertDispatched(ConsultationStarted::class);
    }

    public function test_end_teleconsultation_dispatches_event(): void
    {
        Event::fake([ConsultationEnded::class]);

        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'statut' => 'en_cours',
            'type' => 'teleconsultation',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/end");

        $response->assertOk();

        Event::assertDispatched(ConsultationEnded::class);
    }

    // ── Authorization ──────────────────────────────────────────────────────────

    public function test_patient_cannot_rate_video(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
                'rating' => 5,
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_rate_video(): void
    {
        $consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->postJson("/api/v1/consultations/{$consultation->id}/rate-video", [
            'rating' => 3,
        ]);

        $response->assertStatus(401);
    }

    // ── Full teleconsultation lifecycle ─────────────────────────────────────────

    public function test_full_teleconsultation_lifecycle(): void
    {
        // 1. Créer RDV téléconsultation
        $rdv = RendezVous::factory()->teleconsultation()->confirmed()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
        ]);

        // 2. Démarrer consultation → génère room_name
        $startResponse = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/appointments/{$rdv->id}/start");

        $startResponse->assertStatus(201);
        $consultationId = $startResponse->json('data.id');

        $rdv->refresh();
        $this->assertNotNull($rdv->room_name);

        // 3. Enregistrer consentement
        $consentResponse = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultationId}/consent", [
                'accepted' => true,
                'type' => 'teleconsultation',
            ]);
        $consentResponse->assertOk();

        // 4. Enregistrer paramètres vitaux pendant la vidéo
        $vitalsResponse = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultationId}/medical-parameters", [
                'poids' => 68,
                'taille' => 170,
                'temperature' => 37.0,
                'tension_systolique' => 120,
                'tension_diastolique' => 80,
                'frequence_cardiaque' => 72,
                'saturation_o2' => 97,
            ]);
        $vitalsResponse->assertStatus(201);

        // 5. Terminer la consultation
        $endResponse = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultationId}/end");
        $endResponse->assertOk();

        $this->assertDatabaseHas('consultations', [
            'id' => $consultationId,
            'statut' => 'terminee',
            'type' => 'teleconsultation',
        ]);

        // 6. Évaluer la qualité vidéo
        $rateResponse = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/consultations/{$consultationId}/rate-video", [
                'rating' => 4,
                'comment' => 'Bonne connexion, son clair',
            ]);
        $rateResponse->assertOk();

        $this->assertDatabaseHas('consultations', [
            'id' => $consultationId,
            'video_rating' => 4,
            'video_rated_by' => $this->doctor->id,
        ]);
    }

    // ── Dashboard eHealth indicators ───────────────────────────────────────────

    public function test_dashboard_includes_teleconsultation_stats(): void
    {
        Consultation::factory()->count(2)->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'type' => 'teleconsultation',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/consultations/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'stats' => ['total_consultations', 'today_consultations'],
                    'ehealth_indicators',
                ],
            ]);

        $this->assertGreaterThanOrEqual(2, $response->json('data.stats.total_consultations'));
    }
}
