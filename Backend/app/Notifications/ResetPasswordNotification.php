<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(
        private string $token
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        $expireMinutes = (int) config('auth.passwords.users.expire', 60);
        $resetUrl = "{$frontendUrl}/reset-password?token={$this->token}&email=" . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe — TLM-BFA')
            ->greeting("Bonjour {$notifiable->prenoms},")
            ->line('Vous avez demandé la réinitialisation de votre mot de passe.')
            ->action('Réinitialiser mon mot de passe', $resetUrl)
            ->line("Ce lien expirera dans {$expireMinutes} minutes.")
            ->line('Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.')
            ->salutation('L\'équipe TLM-BFA');
    }
}
