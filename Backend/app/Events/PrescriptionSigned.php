<?php

namespace App\Events;

use App\Models\Prescription;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PrescriptionSigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Prescription $prescription
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];

        // Notifier le patient via la consultation → rendez-vous → patient
        $consultation = $this->prescription->consultation;
        if ($consultation) {
            $channels[] = new PrivateChannel('consultation.' . $consultation->id);

            $rdv = $consultation->rendezVous;
            if ($rdv && $rdv->patient_id) {
                $channels[] = new PrivateChannel('patient.' . $rdv->patient_id);
            }
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'id'              => $this->prescription->id,
            'denomination'    => $this->prescription->denomination,
            'consultation_id' => $this->prescription->consultation_id,
        ];
    }

    public function broadcastAs(): string
    {
        return 'prescription.signed';
    }
}
