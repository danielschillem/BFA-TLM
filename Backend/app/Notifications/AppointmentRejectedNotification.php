<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification envoyée au patient quand un médecin refuse un rendez-vous.
 */
class AppointmentRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RendezVous $rendezVous,
        public ?string $reason = null
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $doctor = $this->rendezVous->user;
        $doctorName = $doctor ? "Dr. {$doctor->prenoms} {$doctor->nom}" : 'Le médecin';
        $date = $this->rendezVous->date?->format('d/m/Y');
        $heure = $this->rendezVous->heure;

        $mail = (new MailMessage)
            ->subject("Rendez-vous non confirmé - {$date}")
            ->greeting("Bonjour,")
            ->line("{$doctorName} n'a pas pu confirmer votre rendez-vous prévu le {$date} à {$heure}.");

        if ($this->reason) {
            $mail->line("**Motif** : {$this->reason}");
        }

        return $mail
            ->line('Nous vous invitons à choisir un autre créneau disponible.')
            ->action('Rechercher un autre créneau', url('/directory'))
            ->line('Nous nous excusons pour ce désagrément.')
            ->salutation('Cordialement,');
    }

    public function toArray(object $notifiable): array
    {
        $doctor = $this->rendezVous->user;
        
        return [
            'type' => 'appointment_rejected',
            'title' => 'Rendez-vous non confirmé',
            'message' => 'Votre demande de rendez-vous du ' 
                . $this->rendezVous->date?->format('d/m/Y') . ' à ' . $this->rendezVous->heure 
                . ' n\'a pas été confirmée.',
            'appointment_id' => $this->rendezVous->id,
            'doctor_id' => $doctor?->id,
            'doctor_name' => $doctor?->full_name,
            'date' => $this->rendezVous->date?->toDateString(),
            'time' => $this->rendezVous->heure,
            'reason' => $this->reason ?? $this->rendezVous->motif_annulation,
            'action_url' => '/directory',
        ];
    }
}
