<?php

namespace App\Events;

use App\Models\RendezVous;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentConfirmed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public RendezVous $rendezVous
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];

        // Notifier le patient
        if ($this->rendezVous->patient_id) {
            $channels[] = new PrivateChannel('patient.' . $this->rendezVous->patient_id);
        }

        // Notifier le médecin
        if ($this->rendezVous->user_id) {
            $channels[] = new PrivateChannel('App.Models.User.' . $this->rendezVous->user_id);
        }

        // Canal du rendez-vous
        $channels[] = new PrivateChannel('appointment.' . $this->rendezVous->id);

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'id'     => $this->rendezVous->id,
            'type'   => $this->rendezVous->type,
            'date'   => $this->rendezVous->date?->toDateString(),
            'heure'  => $this->rendezVous->heure,
            'statut' => $this->rendezVous->statut,
            'patient_id' => $this->rendezVous->patient_id,
            'user_id'    => $this->rendezVous->user_id,
        ];
    }

    public function broadcastAs(): string
    {
        return 'appointment.confirmed';
    }
}
