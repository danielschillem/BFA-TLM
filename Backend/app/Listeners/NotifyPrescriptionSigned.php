<?php

namespace App\Listeners;

use App\Events\PrescriptionSigned;
use App\Notifications\PrescriptionSignedNotification;

class NotifyPrescriptionSigned
{
    public function handle(PrescriptionSigned $event): void
    {
        $prescription = $event->prescription;
        $patient = $prescription->consultation?->dossierPatient?->patient;

        if ($patient?->user) {
            $patient->user->notify(new PrescriptionSignedNotification($prescription));
        }
    }
}
