<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'identifiant_national' => $this->identifiant_national,
            'first_name' => $this->prenoms,
            'last_name' => $this->nom,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->telephone_1,
            'gender' => $this->sexe === 'M' ? 'male' : ($this->sexe === 'F' ? 'female' : null),
            'specialty' => $this->specialite,
            'matricule' => $this->matricule,
            'avatar' => $this->photo,
            'status' => match ($this->status) {
                'actif' => 'active',
                'inactif' => 'inactive',
                'suspendu' => 'suspended',
                default => $this->status,
            },
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')),
            'permissions' => $this->whenLoaded('permissions', fn () => $this->getAllPermissions()->pluck('name')),
            'structure' => new StructureResource($this->whenLoaded('structure')),
            'service' => $this->whenLoaded('service', fn () => [
                'id' => $this->service->id,
                'name' => $this->service->libelle,
            ]),
            'last_login_at' => $this->last_login_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
