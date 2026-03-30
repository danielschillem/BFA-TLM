<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Teleexpertise;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeleexpertiseTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $specialist;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->specialist = User::factory()->doctor()->create(['status' => 'actif']);
        $this->specialist->assignRole('specialist');

        $this->patient = Patient::factory()->create();
    }

    public function test_list_teleexpertise(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/teleexpertise');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_create_teleexpertise(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/teleexpertise', [
                'title' => 'Avis cardiologie',
                'clinical_summary' => 'Patient avec douleur thoracique récurrente',
                'urgency_level' => 'high',
                'specialty_requested' => 'Cardiologie',
                'question' => 'Faut-il envisager une coronarographie ?',
                'specialist_id' => $this->specialist->id,
                'patient_id' => $this->patient->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('teleexpertises', [
            'titre' => 'Avis cardiologie',
            'resume_clinique' => 'Patient avec douleur thoracique récurrente',
            'priorite' => 'haute',
            'expert_id' => $this->specialist->id,
        ]);
    }

    public function test_create_teleexpertise_accepts_legacy_french_payload(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/teleexpertise', [
                'titre' => 'Avis neurologie',
                'resume_clinique' => 'Patient avec céphalées persistantes et épisodes vertigineux récents.',
                'question' => 'Quel bilan complémentaire recommandez-vous ?',
                'priorite' => 'urgente',
                'specialite_demandee' => 'Neurologie',
                'expert_id' => $this->specialist->id,
                'patient_id' => $this->patient->id,
                'genre_patient' => 'F',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Avis neurologie')
            ->assertJsonPath('data.urgency_level', 'urgent')
            ->assertJsonPath('data.patient_gender', 'female');
    }

    public function test_create_validates_required_fields(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/teleexpertise', []);

        $response->assertStatus(422);
    }

    public function test_expert_can_accept(): void
    {
        $te = Teleexpertise::create([
            'titre' => 'Test TE',
            'description' => 'Description',
            'statut' => 'en_attente',
            'priorite' => 'normale',
            'specialite_demandee' => 'Cardiologie',
            'demandeur_id' => $this->doctor->id,
            'expert_id' => $this->specialist->id,
            'patient_id' => $this->patient->id,
        ]);

        $response = $this->actingAs($this->specialist, 'api')
            ->postJson("/api/v1/teleexpertise/{$te->id}/accept");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_expert_can_respond(): void
    {
        $te = Teleexpertise::create([
            'titre' => 'Test TE',
            'description' => 'Description',
            'statut' => 'acceptee',
            'priorite' => 'normale',
            'specialite_demandee' => 'Cardiologie',
            'demandeur_id' => $this->doctor->id,
            'expert_id' => $this->specialist->id,
            'patient_id' => $this->patient->id,
        ]);

        $response = $this->actingAs($this->specialist, 'api')
            ->postJson("/api/v1/teleexpertise/{$te->id}/respond", [
                'response' => 'Coronarographie recommandée',
                'recommendations' => 'Orienter vers CHU',
                'follow_up_required' => true,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_stats(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/teleexpertise/stats');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_teleexpertise_requires_auth(): void
    {
        $this->getJson('/api/v1/teleexpertise')->assertStatus(401);
    }
}
