<?php

namespace Tests\Feature;

use App\Models\Allergie;
use App\Models\Antecedent;
use App\Models\Consultation;
use App\Models\Diagnostic;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MedicalRecordTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected Patient $patient;
    protected DossierPatient $dossier;
    protected Consultation $consultation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->patient = Patient::factory()->create();
        $this->dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);

        $rdv = RendezVous::factory()->create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->doctor->id,
        ]);
        $this->consultation = Consultation::factory()->create([
            'user_id' => $this->doctor->id,
            'dossier_patient_id' => $this->dossier->id,
            'rendez_vous_id' => $rdv->id,
        ]);
    }

    // ── Antécédents ───────────────────────────────────────────────────────────

    public function test_create_antecedent(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/antecedents', [
                'libelle' => 'Diabète type 2',
                'type' => 'medical',
                'description' => 'Diagnostiqué en 2020',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_update_antecedent(): void
    {
        $ant = Antecedent::create([
            'libelle' => 'HTA',
            'type' => 'medical',
            'dossier_patient_id' => $this->dossier->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/antecedents/{$ant->id}", [
                'libelle' => 'HTA grade 2',
                'type' => 'medical',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertOk();
    }

    public function test_delete_antecedent(): void
    {
        $ant = Antecedent::create([
            'libelle' => 'Supprimable',
            'type' => 'chirurgical',
            'dossier_patient_id' => $this->dossier->id,
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->deleteJson("/api/v1/antecedents/{$ant->id}");

        $response->assertOk();
    }

    public function test_create_antecedent_validates(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/antecedents', []);

        $response->assertStatus(422);
    }

    // ── Allergies ─────────────────────────────────────────────────────────────

    public function test_create_allergie(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/allergies', [
                'allergenes' => 'Pénicilline',
                'manifestations' => 'Éruption cutanée',
                'severite' => 'moderee',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_update_allergie(): void
    {
        $allergie = Allergie::create([
            'allergenes' => 'Arachide',
            'severite' => 'legere',
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/allergies/{$allergie->id}", [
                'allergenes' => 'Arachide',
                'severite' => 'severe',
                'dossier_patient_id' => $this->dossier->id,
            ]);

        $response->assertOk();
    }

    public function test_delete_allergie(): void
    {
        $allergie = Allergie::create([
            'allergenes' => 'Latex',
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->deleteJson("/api/v1/allergies/{$allergie->id}");

        $response->assertOk();
    }

    // ── Diagnostics ───────────────────────────────────────────────────────────

    public function test_create_diagnostic(): void
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
    }

    public function test_update_diagnostic(): void
    {
        $diag = Diagnostic::create([
            'libelle' => 'Suspicion dengue',
            'type' => 'differentiel',
            'statut' => 'presume',
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/diagnostics/{$diag->id}", [
                'libelle' => 'Dengue confirmée',
                'statut' => 'confirme',
                'consultation_id' => $this->consultation->id,
            ]);

        $response->assertOk();
    }

    public function test_delete_diagnostic(): void
    {
        $diag = Diagnostic::create([
            'libelle' => 'A supprimer',
            'type' => 'secondaire',
            'consultation_id' => $this->consultation->id,
            'dossier_patient_id' => $this->dossier->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->deleteJson("/api/v1/diagnostics/{$diag->id}");

        $response->assertOk();
    }

    public function test_create_diagnostic_validates(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/diagnostics', []);

        $response->assertStatus(422);
    }

    // ── Auth requise ──────────────────────────────────────────────────────────

    public function test_antecedents_require_auth(): void
    {
        $this->postJson('/api/v1/antecedents', [])->assertStatus(401);
    }

    public function test_allergies_require_auth(): void
    {
        $this->postJson('/api/v1/allergies', [])->assertStatus(401);
    }

    public function test_diagnostics_require_auth(): void
    {
        $this->postJson('/api/v1/diagnostics', [])->assertStatus(401);
    }
}
