<?php

namespace App\Listeners;

use App\Events\AppointmentConfirmed;
use App\Notifications\AppointmentConfirmedNotification;

class SendAppointmentConfirmedNotification
{
    public function handle(AppointmentConfirmed $event): void
    {
        $rdv = $event->rendezVous;
        $patient = $rdv->patient;

        if ($patient?->user) {
            $patient->user->notify(new AppointmentConfirmedNotification($rdv));
        }
    }
}
