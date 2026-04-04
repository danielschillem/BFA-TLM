<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification envoyée au médecin quand un patient prend rendez-vous.
 */
class AppointmentCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RendezVous $rendezVous
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $patient = $this->rendezVous->patient;
        $patientName = $patient?->full_name ?? 'Un patient';
        $date = $this->rendezVous->date?->format('d/m/Y');
        $heure = $this->rendezVous->heure;
        $type = $this->rendezVous->type === 'teleconsultation' ? 'Téléconsultation' : 'Consultation présentiel';

        return (new MailMessage)
            ->subject("Nouvelle demande de rendez-vous - {$patientName}")
            ->greeting("Bonjour Dr. {$notifiable->nom},")
            ->line("{$patientName} souhaite prendre un rendez-vous avec vous.")
            ->line("**Type** : {$type}")
            ->line("**Date** : {$date} à {$heure}")
            ->line("**Motif** : " . ($this->rendezVous->motif ?? 'Non précisé'))
            ->action('Voir et valider le rendez-vous', url("/appointments/{$this->rendezVous->id}"))
            ->line('Merci de confirmer ou refuser ce rendez-vous dans les meilleurs délais.')
            ->salutation('Cordialement,');
    }

    public function toArray(object $notifiable): array
    {
        $patient = $this->rendezVous->patient;
        
        return [
            'type' => 'appointment_created',
            'title' => 'Nouvelle demande de RDV',
            'message' => ($patient?->full_name ?? 'Un patient') . ' demande un rendez-vous le ' 
                . $this->rendezVous->date?->format('d/m/Y') . ' à ' . $this->rendezVous->heure,
            'appointment_id' => $this->rendezVous->id,
            'patient_id' => $patient?->id,
            'patient_name' => $patient?->full_name,
            'date' => $this->rendezVous->date?->toDateString(),
            'time' => $this->rendezVous->heure,
            'appointment_type' => $this->rendezVous->type,
            'action_url' => "/appointments/{$this->rendezVous->id}",
            'requires_action' => true,
        ];
    }
}
