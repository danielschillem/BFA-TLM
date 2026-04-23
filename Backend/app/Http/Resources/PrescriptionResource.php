<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\MissingValue;

class PrescriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $consultation = $this->whenLoaded('consultation');
        $hasConsultation = !($consultation instanceof MissingValue) && $consultation;

        return [
            'id' => $this->id,
            'name' => $this->denomination,
            'dosage' => $this->posologie,
            'instructions' => $this->instructions,
            'duration_days' => $this->duree_jours,
            'start_date' => $this->date_debut?->toISOString(),
            'end_date' => $this->date_fin?->toISOString(),
            'status' => $this->statut,
            'urgent' => $this->urgent,
            'signed' => $this->signee,
            'consultation_id' => $this->consultation_id,
            'consultation' => $this->when($hasConsultation, function () use ($consultation) {
                /** @var \App\Models\Consultation $consultation */
                return [
                    'id' => $consultation->id,
                    'date' => $consultation->date?->toISOString(),
                    'motif' => $consultation->motif_principal,
                    'type' => $consultation->type,
                    'statut' => $consultation->statut,
                    'doctor' => $this->when($consultation->relationLoaded('user') && $consultation->user, [
                        'id' => $consultation->user?->id,
                        'name' => trim(($consultation->user?->prenoms ?? '') . ' ' . ($consultation->user?->nom ?? '')),
                    ]),
                    'patient' => $this->when(
                        $consultation->relationLoaded('dossierPatient') &&
                        $consultation->dossierPatient?->relationLoaded('patient') &&
                        $consultation->dossierPatient?->patient,
                        function () use ($consultation) {
                            $p = $consultation->dossierPatient->patient;
                            return [
                                'id' => $p->id,
                                'name' => trim(($p->prenom ?? '') . ' ' . ($p->nom ?? '')),
                            ];
                        }
                    ),
                ];
            }),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
