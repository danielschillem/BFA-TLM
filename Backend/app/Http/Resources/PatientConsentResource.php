<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientConsentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'version' => $this->version,
            'texte_consentement' => $this->texte_consentement,
            'accepted' => $this->accepted,
            'is_active' => $this->is_active,
            'accepted_at' => $this->accepted_at?->toISOString(),
            'revoked_at' => $this->revoked_at?->toISOString(),
            'motif_revocation' => $this->motif_revocation,

            // Proxy
            'is_proxy' => $this->is_proxy,
            'proxy_nom' => $this->when($this->is_proxy, $this->proxy_nom),
            'proxy_lien' => $this->when($this->is_proxy, $this->proxy_lien),
            'proxy_piece_identite' => $this->when($this->is_proxy, $this->proxy_piece_identite),

            // Relations
            'patient_id' => $this->patient_id,
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => trim($this->user->prenoms . ' ' . $this->user->nom),
            ]),
            'revoked_by_user' => $this->whenLoaded('revokedByUser', fn () => [
                'id' => $this->revokedByUser->id,
                'name' => trim($this->revokedByUser->prenoms . ' ' . $this->revokedByUser->nom),
            ]),
            'consultation_id' => $this->consultation_id,
            'rendez_vous_id' => $this->rendez_vous_id,

            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
