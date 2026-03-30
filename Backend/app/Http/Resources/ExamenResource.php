<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->libelle,
            'indication' => $this->indication,
            'results' => $this->resultats,
            'comment' => $this->commentaire,
            'status' => $this->statut,
            'urgent' => $this->urgent,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
