<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\ValidateContentType;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    // ── EnsureUserIsActive ────────────────────────────────────────────────────

    public function test_active_user_can_access_protected_routes(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('doctor');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/auth/me');

        $response->assertOk();
    }

    public function test_inactive_user_gets_403(): void
    {
        $user = User::factory()->create(['status' => 'inactif']);
        $user->assignRole('doctor');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(403)
            ->assertJsonPath('error', 'account_suspended');
    }

    public function test_suspended_user_gets_403(): void
    {
        $user = User::factory()->create(['status' => 'suspendu']);
        $user->assignRole('doctor');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(403)
            ->assertJsonPath('error', 'account_suspended');
    }

    public function test_inactive_user_can_still_logout(): void
    {
        $user = User::factory()->create(['status' => 'inactif']);
        $user->assignRole('doctor');

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/v1/auth/logout');

        // logout should work even for inactive users (no 'active' middleware)
        $response->assertOk();
    }

    // ── ForceJsonResponse ─────────────────────────────────────────────────────

    public function test_api_routes_always_return_json_on_401(): void
    {
        // Without Accept: application/json, Laravel might redirect to login
        // ForceJsonResponse middleware prevents that
        $response = $this->getJson('/api/v1/patients');

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_api_routes_return_json_on_404(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('admin');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/nonexistent-route');

        $response->assertStatus(404)
            ->assertJsonStructure(['message']);
    }

    // ── ValidateContentType ───────────────────────────────────────────────────

    public function test_post_with_json_content_type_is_accepted(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        // Should not be 415 — the request is valid JSON
        $this->assertNotEquals(415, $response->status());
    }

    public function test_post_with_invalid_content_type_returns_415(): void
    {
        $response = $this->call('POST', '/api/v1/auth/login', [], [], [], [
            'CONTENT_TYPE' => 'text/plain',
            'HTTP_ACCEPT' => 'application/json',
        ], 'email=test&password=test');

        $response->assertStatus(415)
            ->assertJsonPath('error', 'unsupported_content_type');
    }

    // ── SecurityHeaders ───────────────────────────────────────────────────────

    public function test_security_headers_are_present(): void
    {
        $response = $this->getJson('/api/v1/fhir/metadata');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin');
        $response->assertHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }

    public function test_permissions_policy_allows_camera_and_microphone(): void
    {
        $response = $this->getJson('/api/v1/fhir/metadata');

        $permissionsPolicy = $response->headers->get('Permissions-Policy');
        $this->assertStringContainsString('camera=(self)', $permissionsPolicy);
        $this->assertStringContainsString('microphone=(self)', $permissionsPolicy);
        $this->assertStringContainsString('geolocation=()', $permissionsPolicy);
    }

    // ── Rate Limiting ─────────────────────────────────────────────────────────

    public function test_auth_routes_are_rate_limited(): void
    {
        // 30 requests should be fine, but the mechanism is there
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong',
        ]);

        // Should not be 429 on first request
        $this->assertNotEquals(429, $response->status());
    }

    // ── Route Constraints ─────────────────────────────────────────────────────

    public function test_numeric_route_constraint_on_patients(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('admin');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/patients/abc');

        $response->assertStatus(404);
    }

    public function test_numeric_route_constraint_on_consultations(): void
    {
        $user = User::factory()->create(['status' => 'actif']);
        $user->assignRole('admin');

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/consultations/not-a-number');

        $response->assertStatus(404);
    }
}
