<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'body'         => $this->contenu,
            'content'      => $this->contenu,
            'read'         => $this->lu,
            'sender_id'    => $this->sender_id,
            'recipient_id' => $this->recipient_id,
            'sender'       => new UserResource($this->whenLoaded('sender')),
            'recipient'    => new UserResource($this->whenLoaded('recipient')),
            'created_at'   => $this->created_at?->toISOString(),
        ];
    }
}
