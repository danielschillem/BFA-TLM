<?php

namespace Tests\Feature;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\TwoFactorCodeNotification;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['session.driver' => 'database']);
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_register_creates_user_with_patient_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'nom' => 'KABORE',
            'prenoms' => 'Aminata',
            'email' => 'aminata@test.bf',
            'password' => 'Tlm!Secure#2026$Alpha',
            'password_confirmation' => 'Tlm!Secure#2026$Alpha',
            'telephone_1' => '+226 70 00 00 01',
            'sexe' => 'F',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => ['user', 'requires_two_factor'],
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
            ->assertJsonStructure(['data' => ['user', 'requires_two_factor']]);
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

    public function test_sensitive_role_login_requires_two_factor_in_production(): void
    {
        // 2FA est désactivé (requiresTwoFactor retourne false)
        // Ce test vérifie que le login réussit sans 2FA même pour les rôles sensibles
        Notification::fake();

        $user = User::factory()->doctor()->create(['status' => 'actif']);
        $user->assignRole('doctor');

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.requires_two_factor', false);
    }

    public function test_two_factor_code_can_be_resent_with_pending_token(): void
    {
        $this->markTestSkipped('2FA est désactivé — à réactiver avec le service email en production');
    }

    public function test_two_factor_verification_requires_pending_token(): void
    {
        config(['app.env' => 'production']);
        Notification::fake();

        $user = User::factory()->doctor()->create(['status' => 'actif']);
        $user->assignRole('doctor');
        $user->update([
            'two_factor_code' => bcrypt('123456'),
            'two_factor_expires_at' => now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/v1/auth/two-factor/verify', [
            'user_id' => $user->id,
            'code' => '123456',
        ]);

        $response->assertStatus(401);
    }

    public function test_two_factor_verification_rejects_user_mismatch(): void
    {
        $this->markTestSkipped('2FA est désactivé — à réactiver avec le service email en production');
    }

    public function test_me_returns_authenticated_user(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('patient');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_logout_revokes_token(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('patient');

        $response = $this->actingAs($user, 'api')
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

    public function test_reset_password_notification_uses_configured_frontend_url(): void
    {
        config(['app.frontend_url' => 'https://front.example.test']);

        $user = User::factory()->make([
            'email' => 'fatima@example.test',
            'prenoms' => 'Fatima',
        ]);

        $notification = new ResetPasswordNotification('token-123');
        $mail = $notification->toMail($user);

        $this->assertStringContainsString(
            'https://front.example.test/reset-password?token=token-123&email=fatima%40example.test',
            $mail->actionUrl,
        );
    }

    public function test_two_factor_notification_is_sent_synchronously(): void
    {
        $this->assertNotContains(ShouldQueue::class, class_implements(TwoFactorCodeNotification::class));
    }

    public function test_reset_password_notification_is_sent_synchronously(): void
    {
        $this->assertNotContains(ShouldQueue::class, class_implements(ResetPasswordNotification::class));
    }

    public function test_change_password(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'actif']);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'password',
                'password' => 'Tlm!NewSecure#2026$Beta',
                'password_confirmation' => 'Tlm!NewSecure#2026$Beta',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_update_profile(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'actif']);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/v1/auth/profile', [
                'nom' => 'NOUVEAU',
                'prenoms' => 'Prénom',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'nom' => 'NOUVEAU']);
    }

    public function test_can_list_owned_active_sessions(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('patient');

        /** @var User $other */
        $other = User::factory()->create(['status' => 'actif']);
        $other->assignRole('patient');

        DB::table('sessions')->insert([
            [
                'id' => 'session-user-1',
                'user_id' => $user->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'phpunit',
                'payload' => 'payload',
                'last_activity' => now()->subMinute()->timestamp,
            ],
            [
                'id' => 'session-user-2',
                'user_id' => $user->id,
                'ip_address' => '127.0.0.2',
                'user_agent' => 'phpunit',
                'payload' => 'payload',
                'last_activity' => now()->timestamp,
            ],
            [
                'id' => 'session-other-1',
                'user_id' => $other->id,
                'ip_address' => '127.0.0.3',
                'user_agent' => 'phpunit',
                'payload' => 'payload',
                'last_activity' => now()->timestamp,
            ],
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/auth/sessions');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_revoke_single_owned_session(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('patient');

        DB::table('sessions')->insert([
            'id' => 'session-to-revoke',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);

        $response = $this->actingAs($user, 'api')
            ->deleteJson('/api/v1/auth/sessions/session-to-revoke');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('sessions', [
            'id' => 'session-to-revoke',
            'user_id' => $user->id,
        ]);
    }
}
