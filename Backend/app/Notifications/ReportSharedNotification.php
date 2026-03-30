<?php

namespace App\Notifications;

use App\Models\Consultation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReportSharedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Consultation $consultation
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $doctor = $this->consultation->user;
        $date = $this->consultation->date?->format('d/m/Y') ?? $this->consultation->created_at->format('d/m/Y');

        return (new MailMessage)
            ->subject('Votre compte rendu de consultation est disponible — TLM-BFA')
            ->greeting("Bonjour {$notifiable->prenoms},")
            ->line("Le Dr {$doctor->nom} {$doctor->prenoms} a partagé le compte rendu de votre consultation du {$date}.")
            ->line('Vous pouvez le consulter depuis votre espace patient.')
            ->action('Voir le rapport', config('app.frontend_url', 'http://localhost:3000') . '/consultations/' . $this->consultation->id . '/report')
            ->salutation('L\'équipe TLM-BFA');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'report_shared',
            'consultation_id' => $this->consultation->id,
            'doctor_name' => $this->consultation->user?->nom . ' ' . $this->consultation->user?->prenoms,
            'message' => 'Un compte rendu de consultation a été partagé avec vous.',
        ];
    }
}
