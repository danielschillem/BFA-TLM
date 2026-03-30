<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeleexpertiseResource extends JsonResource
{
    private const STATUS_MAP = [
        'en_attente' => 'pending',
        'acceptee'   => 'accepted',
        'rejetee'    => 'rejected',
        'repondue'   => 'responded',
    ];

    private const PRIORITY_MAP = [
        'normale' => 'normal',
        'haute'   => 'high',
        'urgente' => 'urgent',
    ];

    public function toArray(Request $request): array
    {
        $status = self::STATUS_MAP[$this->statut] ?? $this->statut;

        return [
            'id'                    => $this->id,
            'title'                 => $this->titre,
            'description'           => $this->description,
            'status'                => $status,
            'urgency_level'         => self::PRIORITY_MAP[$this->priorite] ?? $this->priorite,
            'specialty_requested'   => $this->specialite_demandee,
            'clinical_summary'      => $this->resume_clinique,
            'question'              => $this->question,
            'patient_age'           => $this->age_patient,
            'patient_gender'        => $this->genre_patient,
            'response'              => $this->reponse,
            'recommendations'       => $this->recommandations,
            'follow_up_required'    => (bool) $this->suivi_requis,
            'decline_reason'        => $this->motif_rejet,
            'requesting_doctor'     => new UserResource($this->whenLoaded('demandeur')),
            'requesting_doctor_id'  => $this->demandeur_id,
            'specialist'            => new UserResource($this->whenLoaded('expert')),
            'specialist_id'         => $this->expert_id,
            'patient'               => new PatientResource($this->whenLoaded('patient')),
            'responded_at'          => $status === 'responded' ? $this->updated_at?->toISOString() : null,
            'created_at'            => $this->created_at?->toISOString(),
        ];
    }
}
