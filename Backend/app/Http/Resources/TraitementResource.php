<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TraitementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'medications' => $this->medicaments,
            'dosages' => $this->dosages,
            'dosage_instructions' => $this->posologies,
            'duration' => $this->duree,
            'status' => $this->statut,
            'diagnostic_id' => $this->diagnostic_id,
            'consultation_id' => $this->consultation_id,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
