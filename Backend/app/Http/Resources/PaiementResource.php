<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaiementResource extends JsonResource
{
    private const STATUS_MAP = [
        'en_attente' => 'pending',
        'confirme'   => 'confirmed',
        'echoue'     => 'failed',
        'rembourse'  => 'refunded',
    ];

    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'phone'             => $this->telephone,
            'amount'            => (float) $this->montant,
            'status'            => self::STATUS_MAP[$this->statut] ?? $this->statut,
            'reference'         => $this->reference,
            'method'            => $this->methode,
            'otp_code'          => $this->code_otp,
            'appointment_id'    => $this->rendez_vous_id,
            'billing_type_id'   => $this->type_facturation_id,
            'appointment'       => new AppointmentResource($this->whenLoaded('rendezVous')),
            'billing_type'      => $this->whenLoaded('typeFacturation', fn () => [
                'id'   => $this->typeFacturation->id,
                'name' => $this->typeFacturation->libelle,
            ]),
            'created_at'        => $this->created_at?->toISOString(),
            'updated_at'        => $this->updated_at?->toISOString(),
        ];
    }
}
