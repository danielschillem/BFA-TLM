<?php

namespace App\Events;

use App\Models\Consultation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConsultationStarted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Consultation $consultation
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('consultation.' . $this->consultation->id),
        ];

        // Notifier le médecin
        if ($this->consultation->user_id) {
            $channels[] = new PrivateChannel('App.Models.User.' . $this->consultation->user_id);
        }

        // Notifier le patient via le rendez-vous
        $rdv = $this->consultation->rendezVous;
        if ($rdv && $rdv->patient_id) {
            $channels[] = new PrivateChannel('patient.' . $rdv->patient_id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'id'             => $this->consultation->id,
            'statut'         => $this->consultation->statut,
            'type'           => $this->consultation->type,
            'date'           => $this->consultation->date?->toISOString(),
            'rendez_vous_id' => $this->consultation->rendez_vous_id,
            'user_id'        => $this->consultation->user_id,
        ];
    }

    public function broadcastAs(): string
    {
        return 'consultation.started';
    }
}
