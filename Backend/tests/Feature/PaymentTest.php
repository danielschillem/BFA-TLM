<?php

namespace Tests\Feature;

use App\Models\Acte;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Paiement;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $patientUser;
    protected Patient $patient;
    protected DossierPatient $dossier;
    protected RendezVous $rdv;
    protected Consultation $consultation;

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

        $this->rdv = RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
        ]);

        $this->consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'rendez_vous_id' => $this->rdv->id,
        ]);
    }

    // ── Initiate ──────────────────────────────────────────────────────────────

    public function test_can_initiate_payment(): void
    {
        // Attacher des actes au RDV pour que le montant soit calculé côté serveur
        $acte = Acte::factory()->create(['cout' => 5000]);
        $this->rdv->actes()->attach($acte->id);

        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson("/api/v1/payments/consultations/{$this->consultation->id}/initiate", [
                'method' => 'orange_money',
                'phone' => '+22670000001',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['fees']);

        $this->assertDatabaseHas('paiements', [
            'methode' => 'orange_money',
            'statut' => 'en_attente',
        ]);
    }

    public function test_initiate_payment_validates_method(): void
    {
        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson("/api/v1/payments/consultations/{$this->consultation->id}/initiate", [
                'method' => 'invalid_method',
            ]);

        $response->assertStatus(422);
    }

    public function test_initiate_payment_with_card(): void
    {
        $acte = Acte::factory()->create(['cout' => 10000]);
        $this->rdv->actes()->attach($acte->id);

        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson("/api/v1/payments/consultations/{$this->consultation->id}/initiate", [
                'method' => 'card',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('paiements', [
            'methode' => 'carte',
            'statut' => 'en_attente',
        ]);
    }

    // ── Confirm ───────────────────────────────────────────────────────────────

    public function test_can_confirm_payment(): void
    {
        $paiement = Paiement::create([
            'montant' => 5000,
            'methode' => 'orange_money',
            'statut' => 'en_attente',
            'reference' => 'PAY-TEST12345',
            'rendez_vous_id' => $this->rdv->id,
        ]);

        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson('/api/v1/payments/confirm', [
                'reference' => 'PAY-TEST12345',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('paiements', [
            'id' => $paiement->id,
            'statut' => 'confirme',
        ]);
    }

    public function test_cannot_confirm_already_confirmed_payment(): void
    {
        Paiement::create([
            'montant' => 5000,
            'methode' => 'orange_money',
            'statut' => 'confirme',
            'reference' => 'PAY-ALREADYCONF',
            'rendez_vous_id' => $this->rdv->id,
        ]);

        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson('/api/v1/payments/confirm', [
                'reference' => 'PAY-ALREADYCONF',
            ]);

        $response->assertStatus(422);
    }

    public function test_confirm_nonexistent_reference_fails(): void
    {
        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson('/api/v1/payments/confirm', [
                'reference' => 'PAY-DOESNOTEXIST',
            ]);

        $response->assertStatus(404);
    }

    // ── Doctor Validate ───────────────────────────────────────────────────────

    public function test_doctor_can_validate_payment(): void
    {
        $paiement = Paiement::create([
            'montant' => 5000,
            'methode' => 'especes',
            'statut' => 'en_attente',
            'reference' => 'PAY-DOCVAL1',
            'rendez_vous_id' => $this->rdv->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/payments/{$paiement->id}/doctor-validate");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('paiements', [
            'id' => $paiement->id,
            'statut' => 'confirme',
        ]);
    }

    // ── Statement ─────────────────────────────────────────────────────────────

    public function test_doctor_can_get_payment_statement(): void
    {
        Paiement::create([
            'montant' => 3000,
            'methode' => 'orange_money',
            'statut' => 'confirme',
            'reference' => 'PAY-STMT1',
            'rendez_vous_id' => $this->rdv->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/payments/statement');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'stats']);
    }

    // ── Unauthorized ──────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_initiate_payment(): void
    {
        $response = $this->postJson("/api/v1/payments/consultations/{$this->consultation->id}/initiate", [
            'amount' => 5000,
            'method' => 'orange_money',
        ]);

        $response->assertStatus(401);
    }
}
