<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $doctor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->user = User::factory()->create(['status' => 'actif']);
        $this->user->assignRole('patient');

        $this->doctor = User::factory()->doctor()->create([
            'status' => 'actif',
            'specialite' => 'Cardiologie',
        ]);
        $this->doctor->assignRole('doctor');
    }

    public function test_search_doctors(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/v1/directory/doctors');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_get_doctor_detail(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/directory/doctors/{$this->doctor->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_get_specialties(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/v1/directory/specialties');

        $response->assertOk();
    }

    public function test_directory_requires_auth(): void
    {
        $this->getJson('/api/v1/directory/doctors')->assertStatus(401);
    }
}
