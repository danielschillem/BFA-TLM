<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AppointmentConfirmedNotification extends Notification implements ShouldQueue
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

        return (new MailMessage)
            ->subject('Rendez-vous confirmé — TLM-BFA')
            ->greeting("Bonjour {$notifiable->prenoms},")
            ->line("Votre rendez-vous du {$date} à {$this->rendezVous->heure} a été confirmé.")
            ->line("Médecin : Dr {$doctor->nom} {$doctor->prenoms}")
            ->action('Voir mon rendez-vous', config('app.frontend_url', 'http://localhost:3000') . '/appointments/' . $this->rendezVous->id)
            ->salutation('L\'équipe TLM-BFA');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'appointment_confirmed',
            'rendez_vous_id' => $this->rendezVous->id,
            'date' => $this->rendezVous->date?->format('Y-m-d'),
            'message' => 'Votre rendez-vous a été confirmé.',
        ];
    }
}
