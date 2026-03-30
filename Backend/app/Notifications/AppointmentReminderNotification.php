<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AppointmentReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private RendezVous $rendezVous
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $doctor = $this->rendezVous->user;
        $date = $this->rendezVous->date?->format('d/m/Y');
        $heure = $this->rendezVous->heure;
        $type = $this->rendezVous->type === 'teleconsultation' ? 'Téléconsultation' : 'Consultation en présentiel';

        return (new MailMessage)
            ->subject("Rappel : {$type} le {$date} — TLM-BFA")
            ->greeting("Bonjour {$notifiable->prenoms},")
            ->line("Vous avez un rendez-vous prévu :")
            ->line("- **Type** : {$type}")
            ->line("- **Date** : {$date} à {$heure}")
            ->line("- **Médecin** : Dr {$doctor->nom} {$doctor->prenoms}")
            ->action('Voir mon rendez-vous', config('app.frontend_url', 'http://localhost:3000') . '/appointments/' . $this->rendezVous->id)
            ->salutation('L\'équipe TLM-BFA');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'appointment_reminder',
            'rendez_vous_id' => $this->rendezVous->id,
            'date' => $this->rendezVous->date?->format('Y-m-d'),
            'heure' => $this->rendezVous->heure,
            'message' => 'Rappel de votre rendez-vous.',
        ];
    }
}
