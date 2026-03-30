<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HabitudeDeVieResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'status' => $this->statut,
            'details' => $this->details,
            'start_date' => $this->date_debut?->toDateString(),
            'end_date' => $this->date_fin?->toDateString(),
            'intensity' => $this->intensite,
            'frequency' => $this->frequence,
            'notes' => $this->notes,
            'consultation_id' => $this->consultation_id,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
