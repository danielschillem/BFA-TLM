<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'body'            => $this->contenu,
            'content'         => $this->contenu,
            'read'            => $this->lu,
            'read_at'         => $this->read_at?->toISOString(),
            'sender_id'       => $this->sender_id,
            'recipient_id'    => $this->recipient_id,
            'sender'          => new UserResource($this->whenLoaded('sender')),
            'recipient'       => new UserResource($this->whenLoaded('recipient')),
            'has_attachment'  => $this->hasAttachment(),
            'attachment'      => $this->when($this->hasAttachment(), fn() => [
                'name' => $this->attachment_name,
                'type' => $this->attachment_type,
                'size' => $this->attachment_size,
                'url'  => $this->attachment_url,
            ]),
            'created_at'      => $this->created_at?->toISOString(),
        ];
    }
}
