<?php

namespace App\Listeners;

use App\Events\ConsultationEnded;

class UpdateDossierOnConsultationEnd
{
    public function handle(ConsultationEnded $event): void
    {
        $consultation = $event->consultation;
        $dossier = $consultation->dossierPatient;

        if ($dossier) {
            $dossier->update([
                'date_derniere_consultation' => now(),
            ]);
        }
    }
}
