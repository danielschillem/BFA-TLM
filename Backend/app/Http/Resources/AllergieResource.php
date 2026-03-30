<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AllergieResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'allergen' => $this->allergenes,
            'manifestations' => $this->manifestations,
            'severity' => $this->severite,
            'consultation_id' => $this->consultation_id,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
