<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Paiement extends Model
{
    protected $fillable = [
        'telephone', 'montant', 'montant_consultation', 'frais_plateforme',
        'frais_mobile_money', 'code_otp', 'statut', 'reference', 'methode',
        'rendez_vous_id', 'type_facturation_id',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'decimal:2',
            'montant_consultation' => 'decimal:2',
            'frais_plateforme' => 'decimal:2',
            'frais_mobile_money' => 'decimal:2',
        ];
    }

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class);
    }

    public function typeFacturation()
    {
        return $this->belongsTo(TypeFacturation::class);
    }
}
