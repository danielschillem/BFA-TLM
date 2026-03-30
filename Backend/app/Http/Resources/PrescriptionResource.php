<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->denomination,
            'dosage' => $this->posologie,
            'instructions' => $this->instructions,
            'duration_days' => $this->duree_jours,
            'status' => $this->statut,
            'urgent' => $this->urgent,
            'signed' => $this->signee,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
