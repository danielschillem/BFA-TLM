<?php

namespace App\Listeners;

use App\Events\ConsultationStarted;

class LogConsultationStarted
{
    public function handle(ConsultationStarted $event): void
    {
        $consultation = $event->consultation;

        activity('consultation')
            ->performedOn($consultation)
            ->causedBy($consultation->user_id)
            ->withProperties([
                'motif' => $consultation->motif_principal,
                'type' => $consultation->type,
                'dossier_patient_id' => $consultation->dossier_patient_id,
            ])
            ->log('Consultation démarrée');
    }
}
