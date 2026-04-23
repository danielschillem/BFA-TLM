<?php

namespace Tests\Feature;

use App\Models\Grade;
use App\Models\Localite;
use App\Models\Pays;
use App\Models\Salle;
use App\Models\Service;
use App\Models\Structure;
use App\Models\TypeProfessionnelSante;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GestionnaireTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected User $doctor;
    protected Structure $structure;
    protected Service $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->structure = Structure::factory()->create();

        $this->manager = User::factory()->create([
            'status' => 'actif',
            'structure_id' => $this->structure->id,
        ]);
        $this->manager->assignRole('structure_manager');

        $this->service = Service::create([
            'libelle' => 'Médecine Générale',
            'code' => 'MG-GEST-TEST',
            'structure_id' => $this->structure->id,
        ]);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');
    }

    public function test_manager_can_access_dashboard(): void
    {
        $response = $this->actingAs($this->manager, 'api')
            ->getJson('/api/v1/gestionnaire/dashboard');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_doctor_cannot_access_gestionnaire_dashboard(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/gestionnaire/dashboard');

        $response->assertStatus(403);
    }

    // ── Professionnels ──────────────────────────────────────────

    public function test_manager_can_list_professionnels(): void
    {
        $response = $this->actingAs($this->manager, 'api')
            ->getJson('/api/v1/gestionnaire/professionnels');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_manager_can_create_professionnel(): void
    {
        $grade = Grade::firstOrCreate(['libelle' => 'Médecin'], ['code' => 'MED']);
        $typePro = TypeProfessionnelSante::firstOrCreate(['libelle' => 'Médecin généraliste']);
        $pays = Pays::firstOrCreate(['nom' => 'Burkina Faso'], ['code' => 'BF', 'indicatif' => '+226']);
        $localite = Localite::firstOrCreate(['region' => 'Centre', 'province' => 'Kadiogo', 'commune' => 'Ouagadougou', 'pays_id' => $pays->id]);

        $response = $this->actingAs($this->manager, 'api')
            ->postJson('/api/v1/gestionnaire/professionnels', [
                'nom' => 'Sawadogo',
                'prenoms' => 'Ibrahim',
                'email' => 'ibrahim.test@tlm.bf',
                'password' => 'SecureP@ss1',
                'telephone_1' => '+226 70 00 00 01',
                'sexe' => 'M',
                'date_naissance' => '1985-03-15',
                'lieu_naissance' => 'Ouagadougou',
                'matricule' => 'MAT-TEST-001',
                'role' => 'doctor',
                'service_id' => $this->service->id,
                'grade_id' => $grade->id,
                'type_professionnel_sante_id' => $typePro->id,
                'localite_id' => $localite->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('users', [
            'email' => 'ibrahim.test@tlm.bf',
            'structure_id' => $this->structure->id,
        ]);
    }

    public function test_manager_cannot_create_pro_in_other_structure_service(): void
    {
        $otherStructure = Structure::factory()->create();
        $otherService = Service::create([
            'libelle' => 'Autre',
            'code' => 'OTHER-SRV',
            'structure_id' => $otherStructure->id,
        ]);

        $grade = Grade::firstOrCreate(['libelle' => 'Médecin'], ['code' => 'MED']);
        $typePro = TypeProfessionnelSante::firstOrCreate(['libelle' => 'Médecin généraliste']);
        $pays = Pays::firstOrCreate(['nom' => 'Burkina Faso'], ['code' => 'BF', 'indicatif' => '+226']);
        $localite = Localite::firstOrCreate(['region' => 'Centre', 'province' => 'Kadiogo', 'commune' => 'Ouagadougou', 'pays_id' => $pays->id]);

        $response = $this->actingAs($this->manager, 'api')
            ->postJson('/api/v1/gestionnaire/professionnels', [
                'nom' => 'Test',
                'prenoms' => 'IDOR',
                'email' => 'idor@test.bf',
                'password' => 'SecureP@ss1',
                'telephone_1' => '+226 70 00 00 02',
                'sexe' => 'M',
                'date_naissance' => '1990-01-01',
                'lieu_naissance' => 'Bobo',
                'matricule' => 'MAT-IDOR-001',
                'role' => 'doctor',
                'service_id' => $otherService->id,
                'grade_id' => $grade->id,
                'type_professionnel_sante_id' => $typePro->id,
                'localite_id' => $localite->id,
            ]);

        // 422 car le service n'appartient pas à la structure du gestionnaire
        $response->assertStatus(422);
    }

    // ── Services ────────────────────────────────────────────────

    public function test_manager_can_list_services(): void
    {
        $response = $this->actingAs($this->manager, 'api')
            ->getJson('/api/v1/gestionnaire/services');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_manager_can_create_service(): void
    {
        $response = $this->actingAs($this->manager, 'api')
            ->postJson('/api/v1/gestionnaire/services', [
                'libelle' => 'Cardiologie',
                'code' => 'CARDIO-GEST',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('services', [
            'code' => 'CARDIO-GEST',
            'structure_id' => $this->structure->id,
        ]);
    }

    // ── Salles ──────────────────────────────────────────────────

    public function test_manager_can_list_salles(): void
    {
        $response = $this->actingAs($this->manager, 'api')
            ->getJson('/api/v1/gestionnaire/salles');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_manager_can_create_salle(): void
    {
        $response = $this->actingAs($this->manager, 'api')
            ->postJson('/api/v1/gestionnaire/salles', [
                'libelle' => 'Salle A',
                'description' => 'Salle de consultation',
                'capacite' => 5,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('salles', [
            'libelle' => 'Salle A',
            'structure_id' => $this->structure->id,
        ]);
    }

    public function test_manager_can_update_salle(): void
    {
        $salle = Salle::create([
            'libelle' => 'Salle B',
            'structure_id' => $this->structure->id,
        ]);

        $response = $this->actingAs($this->manager, 'api')
            ->putJson("/api/v1/gestionnaire/salles/{$salle->id}", [
                'libelle' => 'Salle B Rénovée',
                'capacite' => 10,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_manager_can_delete_salle(): void
    {
        $salle = Salle::create([
            'libelle' => 'Salle Temp',
            'structure_id' => $this->structure->id,
        ]);

        $response = $this->actingAs($this->manager, 'api')
            ->deleteJson("/api/v1/gestionnaire/salles/{$salle->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('salles', ['id' => $salle->id]);
    }

    public function test_unauthenticated_cannot_access_gestionnaire(): void
    {
        $response = $this->getJson('/api/v1/gestionnaire/dashboard');
        $response->assertStatus(401);
    }
}
