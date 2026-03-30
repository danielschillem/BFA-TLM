<?php

namespace App\Console\Commands;

use App\Models\RendezVous;
use App\Notifications\AppointmentReminderNotification;
use Illuminate\Console\Command;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';
    protected $description = 'Envoi des rappels pour les rendez-vous de demain';

    public function handle(): int
    {
        $tomorrow = now()->addDay()->toDateString();

        $appointments = RendezVous::with(['patient.user', 'user'])
            ->whereIn('statut', ['planifie', 'confirme'])
            ->whereDate('date', $tomorrow)
            ->get();

        $count = 0;

        foreach ($appointments as $rdv) {
            // Rappel au patient
            if ($rdv->patient?->user) {
                $rdv->patient->user->notify(new AppointmentReminderNotification($rdv));
                $count++;
            }

            // Rappel au médecin
            if ($rdv->user) {
                $rdv->user->notify(new AppointmentReminderNotification($rdv));
                $count++;
            }
        }

        $this->info("Rappels envoyés : {$count} notifications pour {$appointments->count()} rendez-vous.");

        return self::SUCCESS;
    }
}
