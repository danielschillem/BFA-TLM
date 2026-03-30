<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DossierPatientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'identifier' => $this->identifiant,
            'status' => $this->statut,
            'blood_group' => $this->groupe_sanguin,
            'important_notes' => $this->notes_importantes,
            'consultations_count' => $this->nb_consultations,
            'hospitalizations_count' => $this->nb_hospitalisations,
            'opened_at' => $this->date_ouverture?->toDateString(),
            'last_consultation_at' => $this->date_derniere_consultation?->toDateString(),
            'closed_at' => $this->date_fermeture?->toDateString(),
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'antecedents' => AntecedentResource::collection($this->whenLoaded('antecedents')),
            'constantes' => ConstanteResource::collection($this->whenLoaded('constantes')),
            'consultations' => ConsultationResource::collection($this->whenLoaded('consultations')),
            'allergies' => AllergieResource::collection($this->whenLoaded('allergies')),
            'prescriptions' => PrescriptionResource::collection($this->whenLoaded('prescriptions')),
            'diagnostics' => DiagnosticResource::collection($this->whenLoaded('diagnostics')),
            'examens' => ExamenResource::collection($this->whenLoaded('examens')),
            'examens_cliniques' => ExamenCliniqueResource::collection($this->whenLoaded('examensCliniques')),
            'habitudes_de_vie' => HabitudeDeVieResource::collection($this->whenLoaded('habitudesDeVie')),
            'antecedents_medicamenteux' => AntecedentMedicamenteuxResource::collection($this->whenLoaded('antecedentsMedicamenteux')),
        ];
    }
}
