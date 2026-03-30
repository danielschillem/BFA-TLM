<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->titre,
            'description' => $this->description,
            'mime_type' => $this->type_mime,
            'size' => $this->taille_octets,
            'confidentiality' => $this->niveau_confidentialite,
            'verified' => $this->verifie,
            'uploaded_by' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
