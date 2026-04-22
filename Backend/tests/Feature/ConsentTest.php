<?php

namespace Tests\Feature;

use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\PatientConsent;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConsentTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected Patient $patient;
    protected DossierPatient $dossier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $structure = Structure::factory()->create();

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif', 'structure_id' => $structure->id]);
        $this->doctor->assignRole('doctor');

        $this->patient = Patient::factory()->create();
        $this->patient->forceFill(['structure_id' => $structure->id])->save();
        $this->dossier = DossierPatient::factory()->create(['patient_id' => $this->patient->id]);
    }

    public function test_list_consents(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/consents');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_create_consent(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/consents', [
                'patient_id' => $this->patient->id,
                'type' => 'traitement',
                'texte_consentement' => 'Je consens au traitement proposé.',
                'accepted' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_check_consent(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/consents/check?patient_id={$this->patient->id}&type=traitement");

        $response->assertOk();
    }

    public function test_patient_consent_history(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson("/api/v1/consents/patient/{$this->patient->id}/history");

        $response->assertOk();
    }

    public function test_consents_require_auth(): void
    {
        $this->getJson('/api/v1/consents')->assertStatus(401);
    }
}
