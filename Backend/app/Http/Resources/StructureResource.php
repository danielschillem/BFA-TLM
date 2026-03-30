<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StructureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code_structure' => $this->code_structure,
            'name' => $this->libelle,
            'phone' => $this->telephone,
            'email' => $this->email,
            'logo' => $this->logo,
            'active' => $this->actif,
            'type' => $this->whenLoaded('typeStructure', fn () => [
                'id' => $this->typeStructure->id,
                'name' => $this->typeStructure->libelle,
            ]),
            'localite' => $this->whenLoaded('localite'),
            'created_by' => $this->whenLoaded('createdBy', fn () => [
                'id' => $this->createdBy->id,
                'full_name' => $this->createdBy->full_name,
            ]),
            'services_count' => $this->whenCounted('services'),
            'users_count' => $this->whenCounted('users'),
        ];
    }
}
