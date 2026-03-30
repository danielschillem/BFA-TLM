<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Message $message
    ) {}

    public function broadcastOn(): array
    {
        // Canal de conversation ordonné (plus petit ID en premier)
        $ids = [(int) $this->message->sender_id, (int) $this->message->recipient_id];
        sort($ids);

        return [
            new PrivateChannel("chat.{$ids[0]}.{$ids[1]}"),
            new PrivateChannel('App.Models.User.' . $this->message->recipient_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id'           => $this->message->id,
            'contenu'      => $this->message->contenu,
            'sender_id'    => $this->message->sender_id,
            'recipient_id' => $this->message->recipient_id,
            'lu'           => $this->message->lu,
            'created_at'   => $this->message->created_at?->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.new';
    }
}
