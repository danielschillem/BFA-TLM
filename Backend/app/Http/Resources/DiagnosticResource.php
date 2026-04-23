<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->libelle,
            'icd_code' => $this->code_cim,
            'code_icd11' => $this->code_icd11,
            'titre_icd11' => $this->titre_icd11,
            'uri_icd11' => $this->uri_icd11,
            'severity' => $this->gravite,
            'status' => $this->statut,
            'description' => $this->description,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
