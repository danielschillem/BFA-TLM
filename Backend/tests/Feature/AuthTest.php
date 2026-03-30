<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\ClientRepository;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        // Créer le personal access client requis par Passport
        $clientRepository = app(ClientRepository::class);
        $clientRepository->createPersonalAccessGrantClient('Test Personal Access Client', 'users');
    }

    public function test_register_creates_user_with_patient_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'nom' => 'KABORE',
            'prenoms' => 'Aminata',
            'email' => 'aminata@test.bf',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'telephone_1' => '+226 70 00 00 01',
            'sexe' => 'F',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => ['user', 'token'],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'aminata@test.bf']);
    }

    public function test_register_fails_with_invalid_data(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_with_valid_credentials(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('patient');

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['user', 'token']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['status' => 'actif']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        $user = User::factory()->create(['status' => 'inactif']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(403);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('patient');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('patient');

        // Créer un vrai token via login
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $token = $loginResponse->json('data.token');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_forgot_password_returns_success(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/auth/password/forgot', [
            'email' => $user->email,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_forgot_password_doesnt_reveal_nonexistent_email(): void
    {
        $response = $this->postJson('/api/v1/auth/password/forgot', [
            'email' => 'doesnotexist@test.bf',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_change_password(): void
    {
        $user = User::factory()->create(['status' => 'actif']);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'password',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_update_profile(): void
    {
        $user = User::factory()->create(['status' => 'actif']);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/v1/auth/profile', [
                'nom' => 'NOUVEAU',
                'prenoms' => 'Prénom',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'nom' => 'NOUVEAU']);
    }
}
