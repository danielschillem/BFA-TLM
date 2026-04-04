<?php

namespace App\Events;

use App\Models\RendezVous;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Événement déclenché quand un médecin reprogramme un rendez-vous.
 * Notifie le patient avec les nouvelles date/heure.
 */
class AppointmentRescheduled implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public RendezVous $rendezVous,
        public ?string $oldDate = null,
        public ?string $oldTime = null,
        public ?string $reason = null
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];

        // Notifier le patient
        if ($this->rendezVous->patient?->user_id) {
            $channels[] = new PrivateChannel('App.Models.User.' . $this->rendezVous->patient->user_id);
        }
        if ($this->rendezVous->patient_id) {
            $channels[] = new PrivateChannel('patient.' . $this->rendezVous->patient_id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        $doctor = $this->rendezVous->user;
        
        return [
            'id' => $this->rendezVous->id,
            'type' => $this->rendezVous->type,
            'old_date' => $this->oldDate,
            'old_time' => $this->oldTime,
            'new_date' => $this->rendezVous->date?->toDateString(),
            'new_time' => $this->rendezVous->heure,
            'reason' => $this->reason,
            'doctor' => [
                'id' => $doctor?->id,
                'full_name' => $doctor?->full_name ?? 'Médecin',
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'appointment.rescheduled';
    }
}
