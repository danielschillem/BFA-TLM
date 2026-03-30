<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AntecedentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->libelle,
            'description' => $this->description,
            'type' => $this->type,
            'diagnosis_date' => $this->date_evenement?->toDateString(),
            'treatments' => $this->traitements,
            'current_state' => $this->etat_actuel,
        ];
    }
}
