<?php

namespace Tests\Feature;

use App\Models\CertificatDeces;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\Structure;
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
    protected Structure $structure;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->structure = Structure::factory()->create();
        $this->doctor = User::factory()->doctor()->create([
            'status' => 'actif',
            'structure_id' => $this->structure->id,
        ]);
        $this->doctor->assignRole('doctor');

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');

        $this->patient = Patient::factory()->create(['structure_id' => $this->structure->id]);
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
            ->assertJsonValidationErrors(['date_deces', 'cause_directe']);
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
            ->assertJsonPath('data.numero_certificat', $certificat->numero_certificat)
            ->assertJsonPath('data.nom_defunt', $this->patient->nom)
            ->assertJsonPath('data.prenoms_defunt', $this->patient->prenoms);
    }

    public function test_create_certificat_without_patient_persists_manual_identity(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/certificats-deces', [
                'nom_defunt' => 'SAWADOGO',
                'prenoms_defunt' => 'Aminata',
                'date_naissance_defunt' => '1987-04-12',
                'sexe_defunt' => 'F',
                'lieu_naissance_defunt' => 'Koudougou',
                'nationalite_defunt' => 'Burkinabè',
                'profession_defunt' => 'Commerçante',
                'adresse_defunt' => 'Secteur 4',
                'date_deces' => '2026-03-25 14:30:00',
                'lieu_deces' => 'CHU Yalgado',
                'cause_directe' => 'Choc septique',
                'cause_directe_code_icd11' => '1A40',
                'cause_directe_delai' => '2 jours',
                'maniere_deces' => 'naturelle',
                'observations' => 'Cas sans patient lié.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.nom_defunt', 'SAWADOGO')
            ->assertJsonPath('data.prenoms_defunt', 'Aminata')
            ->assertJsonPath('data.code_icd11_cause_directe', '1A40')
            ->assertJsonPath('data.intervalle_cause_directe', '2 jours')
            ->assertJsonPath('data.notes', 'Cas sans patient lié.');

        $this->assertDatabaseHas('certificat_deces', [
            'id' => $response->json('data.id'),
            'nom_defunt' => 'SAWADOGO',
            'prenoms_defunt' => 'Aminata',
            'structure_id' => $this->structure->id,
        ]);
    }

    public function test_create_certificat_auto_links_patient_dossier(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/certificats-deces', [
                'patient_id' => $this->patient->id,
                'date_deces' => '2026-03-25 14:30:00',
                'lieu_deces' => 'CHU Yalgado',
                'cause_directe' => 'Insuffisance respiratoire aiguë',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.dossier_patient_id', $this->dossier->id)
            ->assertJsonPath('data.nom_defunt', $this->patient->nom)
            ->assertJsonPath('data.prenoms_defunt', $this->patient->prenoms);
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

    public function test_statistiques_are_scoped_to_user_structure(): void
    {
        $otherStructure = Structure::factory()->create();
        $otherDoctor = User::factory()->doctor()->create([
            'status' => 'actif',
            'structure_id' => $otherStructure->id,
        ]);
        $otherDoctor->assignRole('doctor');

        $otherPatient = Patient::factory()->create(['structure_id' => $otherStructure->id]);

        CertificatDeces::factory()->certifie()->create([
            'patient_id' => $this->patient->id,
            'medecin_certificateur_id' => $this->doctor->id,
            'structure_id' => $this->structure->id,
            'maniere_deces' => 'naturelle',
        ]);

        CertificatDeces::factory()->certifie()->create([
            'patient_id' => $otherPatient->id,
            'medecin_certificateur_id' => $otherDoctor->id,
            'structure_id' => $otherStructure->id,
            'maniere_deces' => 'accident',
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/certificats-deces/statistiques');

        $response->assertOk()
            ->assertJsonPath('data.total_deces', 1)
            ->assertJsonPath('data.par_maniere.naturelle', 1)
            ->assertJsonMissingPath('data.par_maniere.accident');
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
