<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->user = User::factory()->create(['status' => 'actif']);
        $this->user->assignRole('patient');

        $this->otherUser = User::factory()->create(['status' => 'actif']);
        $this->otherUser->assignRole('patient');
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
        DatabaseNotification::create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Dummy',
            'notifiable_type' => User::class,
            'notifiable_id' => $this->user->id,
            'data' => ['message' => 'Hello'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/v1/notifications/read-all');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.marked_count', 1);
    }

    public function test_notifications_require_auth(): void
    {
        $this->getJson('/api/v1/notifications')->assertStatus(401);
    }

    public function test_mark_as_read_rejects_invalid_notification_id(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/v1/notifications/not-a-uuid/read');

        $response->assertStatus(404);
    }

    public function test_user_cannot_mark_other_user_notification_as_read(): void
    {
        $notification = DatabaseNotification::create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Dummy',
            'notifiable_type' => User::class,
            'notifiable_id' => $this->otherUser->id,
            'data' => ['message' => 'Other user notification'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/notifications/{$notification->id}/read");

        $response->assertStatus(404);
    }

    public function test_index_supports_unread_only_filter(): void
    {
        DatabaseNotification::create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Dummy',
            'notifiable_type' => User::class,
            'notifiable_id' => $this->user->id,
            'data' => ['message' => 'Read notification'],
            'read_at' => now(),
        ]);

        DatabaseNotification::create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Dummy',
            'notifiable_type' => User::class,
            'notifiable_id' => $this->user->id,
            'data' => ['message' => 'Unread notification'],
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/v1/notifications?unread_only=1');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }
}
