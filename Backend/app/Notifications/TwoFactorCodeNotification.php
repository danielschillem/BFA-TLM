<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TwoFactorCodeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private string $code
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Code de vérification — TLM-BFA')
            ->greeting("Bonjour {$notifiable->prenoms},")
            ->line("Votre code de vérification est : **{$this->code}**")
            ->line('Ce code expire dans 10 minutes.')
            ->line('Si vous n\'avez pas demandé ce code, ignorez cet email.')
            ->salutation('L\'équipe TLM-BFA');
    }
}
