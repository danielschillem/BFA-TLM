<?php

namespace Tests\Feature;

use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientExtendedTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');
    }

    public function test_create_patient_validates_required_fields(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/patients', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nom', 'prenoms', 'sexe']);
    }

    public function test_create_patient_validates_sexe_enum(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/patients', [
                'nom' => 'TEST',
                'prenoms' => 'Patient',
                'sexe' => 'X',
                'date_naissance' => '1990-01-01',
                'telephone_1' => '+226 70 11 22 33',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sexe']);
    }

    public function test_create_patient_validates_date_naissance_format(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/patients', [
                'nom' => 'TEST',
                'prenoms' => 'Patient',
                'sexe' => 'M',
                'date_naissance' => 'not-a-date',
                'telephone_1' => '+226 70 11 22 33',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['date_naissance']);
    }

    public function test_doctor_can_search_patients_by_name(): void
    {
        Patient::factory()->create(['nom' => 'OUEDRAOGO', 'prenoms' => 'Aïcha']);
        Patient::factory()->create(['nom' => 'KABORE', 'prenoms' => 'Sita']);

        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/patients?search=OUEDRAOGO');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_doctor_cannot_delete_patient_without_permission(): void
    {
        $patient = Patient::factory()->create();

        $response = $this->actingAs($this->doctor, 'api')
            ->deleteJson("/api/v1/patients/{$patient->id}");

        $response->assertStatus(403);
    }

    public function test_show_nonexistent_patient_returns_404(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/patients/999999');

        $response->assertStatus(404);
    }

    public function test_admin_can_list_patients(): void
    {
        Patient::factory()->count(2)->create();

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/v1/patients');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_patient_creation_auto_creates_dossier(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/patients', [
                'nom' => 'ZONGO',
                'prenoms' => 'Fatou',
                'date_naissance' => '1995-03-20',
                'sexe' => 'F',
                'telephone_1' => '+226 70 55 66 77',
                'lieu_naissance' => 'Bobo-Dioulasso',
                'nom_personne_prevenir' => 'ZONGO Salif',
                'filiation_personne_prevenir' => 'Père',
                'telephone_personne_prevenir' => '+226 70 11 22 33',
            ]);

        $response->assertStatus(201);

        $patientId = $response->json('data.id');
        $this->assertNotNull($patientId);

        $dossier = DossierPatient::where('patient_id', $patientId)->first();
        $this->assertNotNull($dossier);
        $this->assertEquals('ouvert', $dossier->statut);
    }

    public function test_update_patient_partial_fields(): void
    {
        $patient = Patient::factory()->create(['nom' => 'AVANT']);

        $response = $this->actingAs($this->doctor, 'api')
            ->putJson("/api/v1/patients/{$patient->id}", [
                'nom' => 'APRES',
            ]);

        $response->assertOk();
        // Nom est chiffré en base — vérifier via l'API
        $showResponse = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/patients/{$patient->id}");
        $showResponse->assertOk();
        $this->assertEquals('APRES', $showResponse->json('data.last_name'));
    }
}
