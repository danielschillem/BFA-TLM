<?php

namespace App\Notifications;

use App\Models\Prescription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PrescriptionSignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Prescription $prescription
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $doctor = $this->prescription->consultation?->user;
        $doctorName = $doctor ? "Dr {$doctor->nom} {$doctor->prenoms}" : 'Votre médecin';

        return (new MailMessage)
            ->subject('Ordonnance signée — TLM-BFA')
            ->greeting("Bonjour {$notifiable->prenoms},")
            ->line("{$doctorName} a signé votre ordonnance.")
            ->line("Médicament : {$this->prescription->denomination}")
            ->action('Voir mes ordonnances', config('app.frontend_url', 'http://localhost:3000') . '/prescriptions')
            ->salutation('L\'équipe TLM-BFA');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'prescription_signed',
            'prescription_id' => $this->prescription->id,
            'denomination' => $this->prescription->denomination,
            'message' => "Votre ordonnance « {$this->prescription->denomination} » a été signée.",
        ];
    }
}
