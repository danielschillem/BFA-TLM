<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Événement diffusé quand des messages sont marqués comme lus.
 */
class MessagesRead implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $readerId,
        public int $senderId,
        public array $messageIds
    ) {}

    public function broadcastOn(): array
    {
        // Notifier l'expéditeur que ses messages ont été lus
        return [
            new PrivateChannel('App.Models.User.' . $this->senderId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'reader_id' => $this->readerId,
            'message_ids' => $this->messageIds,
            'read_at' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'messages.read';
    }
}
