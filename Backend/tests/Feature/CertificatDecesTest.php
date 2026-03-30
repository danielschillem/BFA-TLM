<?php

namespace Tests\Feature;

use App\Models\CertificatDeces;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CertificatDecesTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $admin;
    protected Patient $patient;
    protected DossierPatient $dossier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');

        $this->patient = Patient::factory()->create();
        $this->dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public function test_list_certificats(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/certificats-deces');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_create_certificat_brouillon(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/certificats-deces', [
                'patient_id' => $this->patient->id,
                'dossier_patient_id' => $this->dossier->id,
                'date_deces' => '2026-03-25 14:30:00',
                'heure_deces' => '14:30',
                'lieu_deces' => 'CHU Yalgado',
                'type_lieu_deces' => 'hopital',
                'sexe_defunt' => $this->patient->sexe,
                'age_defunt' => 65,
                'unite_age' => 'annees',
                'cause_directe' => 'Insuffisance respiratoire aiguë',
                'cause_directe_code_icd11' => 'CB41.0',
                'cause_directe_delai' => '3 jours',
                'cause_antecedente_1' => 'Pneumonie bactérienne',
                'cause_antecedente_1_code_icd11' => 'CA40.0',
                'cause_antecedente_1_delai' => '7 jours',
                'cause_initiale' => 'Diabète de type 2',
                'cause_initiale_code_icd11' => '5A11',
                'cause_initiale_delai' => '15 ans',
                'maniere_deces' => 'naturelle',
                'observations' => 'Patient suivi depuis 2011.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.statut', 'brouillon');

        // Vérifier le numéro BFA-LPK-DCD-XXXXXXXX
        $this->assertStringStartsWith('BFA-LPK-DCD-', $response->json('data.numero_certificat'));
    }

    public function test_create_validates_required_fields(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/certificats-deces', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['patient_id', 'date_deces', 'cause_directe']);
    }

    public function test_show_certificat(): void
    {
        $certificat = CertificatDeces::factory()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/certificats-deces/{$certificat->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.numero_certificat', $certificat->numero_certificat);
    }

    public function test_update_brouillon(): void
    {
        $certificat = CertificatDeces::factory()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
            'statut' => 'brouillon',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/certificats-deces/{$certificat->id}", [
                'patient_id' => $this->patient->id,
                'date_deces' => '2026-03-25 14:30:00',
                'cause_directe' => 'Arrêt cardiaque — mise à jour',
                'cause_directe_code_icd11' => 'BC80',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_cannot_update_certified(): void
    {
        $certificat = CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/certificats-deces/{$certificat->id}", [
                'patient_id' => $this->patient->id,
                'date_deces' => '2026-03-25 14:30:00',
                'cause_directe' => 'Tentative de modifier un certifié',
            ]);

        $response->assertStatus(422);
    }

    // ── Workflow de certification ──────────────────────────────────────────────

    public function test_certifier_brouillon(): void
    {
        $certificat = CertificatDeces::factory()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
            'statut' => 'brouillon',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/certifier");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.statut', 'certifie');
    }

    public function test_cannot_certifier_twice(): void
    {
        $certificat = CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/certifier");

        $response->assertStatus(422);
    }

    public function test_admin_valider_certifie(): void
    {
        $certificat = CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/valider");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.statut', 'valide');
    }

    public function test_doctor_cannot_valider(): void
    {
        $certificat = CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/valider");

        // Doctor n'a pas permission admin.audit
        $response->assertStatus(403);
    }

    public function test_rejeter_certifie(): void
    {
        $certificat = CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/rejeter", [
                'motif_rejet' => 'Codes CIM-11 manquants sur les causes antécédentes.',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.statut', 'rejete');
    }

    public function test_rejeter_requires_motif(): void
    {
        $certificat = CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/rejeter", []);

        $response->assertStatus(422);
    }

    public function test_annuler_brouillon(): void
    {
        $certificat = CertificatDeces::factory()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
            'statut' => 'brouillon',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/annuler");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_cannot_annuler_valide(): void
    {
        $certificat = CertificatDeces::factory()->valide()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
            'validateur_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson("/api/v1/certificats-deces/{$certificat->id}/annuler");

        $response->assertStatus(422);
    }

    // ── Statistiques ──────────────────────────────────────────────────────────

    public function test_statistiques_mortalite(): void
    {
        // Créer quelques certificats certifiés
        CertificatDeces::factory()->certifie()->count(3)->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
            'maniere_deces' => 'naturelle',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/certificats-deces/statistiques');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_deces',
                    'par_maniere',
                    'par_lieu',
                    'par_sexe',
                    'top_causes_icd11',
                    'mortalite_maternelle',
                ],
            ]);
    }

    // ── Filtrage ──────────────────────────────────────────────────────────────

    public function test_filter_by_statut(): void
    {
        CertificatDeces::factory()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
            'statut' => 'brouillon',
        ]);
        CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/certificats-deces?statut=certifie');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    public function test_certificats_require_auth(): void
    {
        $this->getJson('/api/v1/certificats-deces')->assertStatus(401);
    }

    // ── Identifiant BFA-LPK-DCD ───────────────────────────────────────────────

    public function test_numero_certificat_generated_automatically(): void
    {
        $certificat = CertificatDeces::create([
            'patient_id' => $this->patient->id,
            'date_deces' => now()->subDay(),
            'cause_directe' => 'Test génération identifiant',
            'medecin_certificateur_id' => $this->doctor->id,
        ]);

        $this->assertNotNull($certificat->numero_certificat);
        $this->assertStringStartsWith('BFA-LPK-DCD-', $certificat->numero_certificat);
        $this->assertEquals(20, strlen($certificat->numero_certificat)); // BFA-LPK-DCD-XXXXXXXX = 20 chars
    }
}
