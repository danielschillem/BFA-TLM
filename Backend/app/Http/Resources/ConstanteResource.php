<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConstanteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->libelle,
            'context' => $this->contexte,
            'weight' => $this->poids,
            'height' => $this->taille,
            'bmi' => $this->imc,
            'temperature' => $this->temperature,
            'systolic_bp' => $this->tension_systolique,
            'diastolic_bp' => $this->tension_diastolique,
            'heart_rate' => $this->frequence_cardiaque,
            'respiratory_rate' => $this->frequence_respiratoire,
            'spo2' => $this->saturation_o2,
            'blood_sugar' => $this->glycemie,
            'recorded_by' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
