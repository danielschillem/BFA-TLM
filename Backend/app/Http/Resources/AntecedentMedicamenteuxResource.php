<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AntecedentMedicamenteuxResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'brand_name' => $this->nom_marque,
            'generic_name' => $this->nom_generique,
            'dose' => $this->dose,
            'unit' => $this->unite,
            'route' => $this->voie_administration,
            'duration_days' => $this->duree,
            'tolerance' => $this->tolerance,
            'start_date' => $this->date_debut?->toDateString(),
            'end_date' => $this->date_fin?->toDateString(),
            'consultation_id' => $this->consultation_id,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
