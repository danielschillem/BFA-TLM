<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Événement diffusé quand un utilisateur est en train de taper.
 * Utilise le même canal que les messages.
 */
class UserTyping implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $typerId;
    public int $recipientId;
    public bool $isTyping;

    public function __construct(int $typerId, int $recipientId, bool $isTyping = true)
    {
        $this->typerId = $typerId;
        $this->recipientId = $recipientId;
        $this->isTyping = $isTyping;
    }

    /**
     * Canal de diffusion - même canal que les messages.
     */
    public function broadcastOn(): array
    {
        // Utilise le même canal ordonné que les messages
        $ids = [$this->typerId, $this->recipientId];
        sort($ids);
        
        return [
            new PrivateChannel("chat.{$ids[0]}.{$ids[1]}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'user.typing';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->typerId,
            'is_typing' => $this->isTyping,
            'timestamp' => now()->toISOString(),
        ];
    }
}
