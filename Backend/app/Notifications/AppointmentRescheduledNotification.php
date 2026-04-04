<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification envoyée au patient quand un médecin reprogramme un rendez-vous.
 */
class AppointmentRescheduledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RendezVous $rendezVous,
        public ?string $oldDate = null,
        public ?string $oldTime = null,
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
        $newDate = $this->rendezVous->date?->format('d/m/Y');
        $newTime = $this->rendezVous->heure;

        $mail = (new MailMessage)
            ->subject("Rendez-vous reprogrammé - {$newDate}")
            ->greeting("Bonjour,")
            ->line("{$doctorName} a reprogrammé votre rendez-vous.");

        if ($this->oldDate && $this->oldTime) {
            $mail->line("**Ancienne date** : {$this->oldDate} à {$this->oldTime}");
        }

        $mail->line("**Nouvelle date** : {$newDate} à {$newTime}");

        if ($this->reason) {
            $mail->line("**Motif** : {$this->reason}");
        }

        return $mail
            ->action('Voir le rendez-vous', url("/appointments/{$this->rendezVous->id}"))
            ->line('Si ce créneau ne vous convient pas, vous pouvez annuler et choisir un autre.')
            ->salutation('Cordialement,');
    }

    public function toArray(object $notifiable): array
    {
        $doctor = $this->rendezVous->user;
        
        return [
            'type' => 'appointment_rescheduled',
            'title' => 'Rendez-vous reprogrammé',
            'message' => 'Votre rendez-vous a été reprogrammé au ' 
                . $this->rendezVous->date?->format('d/m/Y') . ' à ' . $this->rendezVous->heure,
            'appointment_id' => $this->rendezVous->id,
            'doctor_id' => $doctor?->id,
            'doctor_name' => $doctor?->full_name,
            'old_date' => $this->oldDate,
            'old_time' => $this->oldTime,
            'new_date' => $this->rendezVous->date?->toDateString(),
            'new_time' => $this->rendezVous->heure,
            'reason' => $this->reason,
            'action_url' => "/appointments/{$this->rendezVous->id}",
        ];
    }
}
