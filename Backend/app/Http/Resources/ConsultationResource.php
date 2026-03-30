<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConsultationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Build a report object from the consultation's observation field
        $reportData = null;
        if ($this->observation) {
            $parsed = json_decode($this->observation, true);
            if (is_array($parsed)) {
                $reportData = $parsed;
            } else {
                $reportData = [
                    'content' => $this->observation,
                    'structured_data' => [],
                ];
            }
        }

        return [
            'id' => $this->id,
            'dossier_patient_id' => $this->dossier_patient_id,
            'reason' => $this->motif_principal,
            'date' => $this->date?->toISOString(),
            'started_at' => $this->date?->toISOString(),
            'observation' => $this->observation,
            'status' => match ($this->statut) {
                'en_cours' => 'in_progress',
                'terminee' => 'completed',
                'planifiee' => 'pending',
                default => $this->statut,
            },
            'type' => $this->type ?? $this->rendezVous?->type ?? 'teleconsultation',
            'follow_up_type' => $this->type_suivi,
            'jitsi_room_name' => $this->whenLoaded('rendezVous', fn () => $this->rendezVous?->room_name),
            'report' => $reportData,
            'doctor' => new UserResource($this->whenLoaded('user')),
            'patient_record' => new DossierPatientResource($this->whenLoaded('dossierPatient')),
            'appointment' => new AppointmentResource($this->whenLoaded('rendezVous')),
            'diagnostics' => DiagnosticResource::collection($this->whenLoaded('diagnostics')),
            'prescriptions' => PrescriptionResource::collection($this->whenLoaded('prescriptions')),
            'examens' => ExamenResource::collection($this->whenLoaded('examens')),
            'treatments' => TraitementResource::collection($this->whenLoaded('traitements')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
