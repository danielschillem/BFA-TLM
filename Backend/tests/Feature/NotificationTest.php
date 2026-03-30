<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->user = User::factory()->create(['status' => 'actif']);
        $this->user->assignRole('patient');
    }

    public function test_list_notifications(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/v1/notifications');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_unread_count(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/v1/notifications/unread-count');

        $response->assertOk();
    }

    public function test_mark_all_as_read(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/v1/notifications/read-all');

        $response->assertOk();
    }

    public function test_notifications_require_auth(): void
    {
        $this->getJson('/api/v1/notifications')->assertStatus(401);
    }
}
