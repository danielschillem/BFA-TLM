<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $scheduledAt = null;
        if ($this->date && $this->heure) {
            $scheduledAt = $this->date->format('Y-m-d') . 'T' . $this->heure;
        }

        return [
            'id' => $this->id,
            'type' => $this->type,
            'reason' => $this->motif,
            'date' => $this->date?->toDateString(),
            'time' => $this->heure,
            'scheduled_at' => $scheduledAt,
            'priority' => $this->priorite,
            'status' => match ($this->statut) {
                'planifie' => 'pending',
                'confirme' => 'confirmed',
                'annule' => 'cancelled',
                'en_cours' => 'in_progress',
                'termine' => 'completed',
                default => $this->statut,
            },
            'room_name' => $this->room_name,
            'summary' => $this->resume,
            'cancellation_reason' => $this->motif_annulation,
            'consultation_id' => $this->consultation?->id,
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'doctor' => new UserResource($this->whenLoaded('user')),
            'structure' => new StructureResource($this->whenLoaded('structure')),
            'consultation' => new ConsultationResource($this->whenLoaded('consultation')),
            'actes' => $this->whenLoaded('actes', fn () => $this->actes->map(fn ($a) => [
                'id' => $a->id,
                'libelle' => $a->libelle,
                'cout' => (float) $a->cout,
                'duree' => $a->duree,
            ])),
            'total_actes' => $this->whenLoaded('actes', fn () => (float) $this->actes->sum('cout')),
            'assistants' => $this->whenLoaded('invites', fn () => $this->invites->map(fn ($u) => [
                'id' => $u->id,
                'first_name' => $u->prenoms,
                'last_name' => $u->nom,
                'specialty' => $u->specialite ?? null,
            ])),
            'payments' => PaiementResource::collection($this->whenLoaded('paiements')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
