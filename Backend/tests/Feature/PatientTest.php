<?php

namespace Tests\Feature;

use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
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
    }

    public function test_doctor_can_list_patients(): void
    {
        Patient::factory()->count(3)->create(['structure_id' => $this->structure->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/patients');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data']);
    }

    public function test_doctor_can_create_patient(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/patients', [
                'nom' => 'TRAORE',
                'prenoms' => 'Moussa',
                'date_naissance' => '1990-05-15',
                'sexe' => 'M',
                'telephone_1' => '+226 70 11 22 33',
                'lieu_naissance' => 'Ouagadougou',
                'nom_personne_prevenir' => 'TRAORE Issa',
                'filiation_personne_prevenir' => 'Frère',
                'telephone_personne_prevenir' => '+226 70 99 88 77',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        // Nom est chiffré en DB, on vérifie via la réponse JSON
        $response->assertJsonPath('data.last_name', 'TRAORE');
        $this->assertDatabaseHas('patients', [
            'id' => $response->json('data.id'),
            'structure_id' => $this->structure->id,
            'created_by_id' => $this->doctor->id,
        ]);
        // Dossier auto-créé
        $this->assertDatabaseCount('dossier_patients', 1);
    }

    public function test_doctor_can_view_patient(): void
    {
        $patient = Patient::factory()->create(['structure_id' => $this->structure->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/patients/{$patient->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_doctor_can_update_patient(): void
    {
        $patient = Patient::factory()->create(['structure_id' => $this->structure->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/patients/{$patient->id}", [
                'telephone_1' => '+226 70 99 88 77',
            ]);

        $response->assertOk();
    }

    public function test_doctor_can_get_patient_record(): void
    {
        $patient = Patient::factory()->create(['structure_id' => $this->structure->id]);
        DossierPatient::factory()->create(['patient_id' => $patient->id]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/patients/{$patient->id}/record");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_doctor_cannot_view_patient_from_other_structure(): void
    {
        $patient = Patient::factory()->create([
            'structure_id' => Structure::factory()->create()->id,
        ]);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/patients/{$patient->id}");

        $response->assertStatus(403);
    }

    public function test_unauthorized_user_cannot_list_patients(): void
    {
        /** @var User $patientUser */
        $patientUser = User::factory()->create(['status' => 'actif']);
        $patientUser->assignRole('patient');

        $response = $this->actingAs($patientUser, 'api')
            ->getJson('/api/v1/patients');

        $response->assertStatus(403);
    }
}
