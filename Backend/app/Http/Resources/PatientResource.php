<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ipp' => $this->ipp,
            'first_name' => $this->prenoms,
            'last_name' => $this->nom,
            'full_name' => $this->full_name,
            'date_of_birth' => $this->date_naissance?->toDateString(),
            'gender' => $this->sexe === 'M' ? 'male' : ($this->sexe === 'F' ? 'female' : null),
            'phone' => $this->telephone_1,
            'email' => $this->email,
            'avatar' => $this->photo,
            'identifiant' => $this->whenLoaded('dossier', fn () => $this->dossier?->identifiant),
            'record' => new DossierPatientResource($this->whenLoaded('dossier')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
