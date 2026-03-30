<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamenCliniqueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'synthese_globale' => $this->synthese_globale,
            'consultation_id' => $this->consultation_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'systemes' => $this->whenLoaded('systemes', fn () => $this->systemes->map(fn ($s) => [
                'id' => $s->id,
                'systeme' => $s->systeme,
                'description' => $s->description,
                'impression' => $s->impression,
            ])),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
