<?php

namespace App\Events;

use App\Models\RendezVous;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Événement déclenché quand un patient autonome crée un rendez-vous.
 * Notifie le médecin pour validation.
 */
class AppointmentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public RendezVous $rendezVous
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];

        // Notifier le médecin (user_id = PS qui doit valider)
        if ($this->rendezVous->user_id) {
            $channels[] = new PrivateChannel('App.Models.User.' . $this->rendezVous->user_id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        $patient = $this->rendezVous->patient;
        
        return [
            'id' => $this->rendezVous->id,
            'type' => $this->rendezVous->type,
            'date' => $this->rendezVous->date?->toDateString(),
            'heure' => $this->rendezVous->heure,
            'motif' => $this->rendezVous->motif,
            'patient' => [
                'id' => $patient?->id,
                'full_name' => $patient?->full_name ?? 'Patient inconnu',
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'appointment.created';
    }
}
