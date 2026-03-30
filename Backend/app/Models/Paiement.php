<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Paiement extends Model
{
    protected $fillable = [
        'telephone', 'montant', 'code_otp', 'statut',
        'reference', 'methode', 'rendez_vous_id', 'type_facturation_id',
    ];

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class);
    }

    public function typeFacturation()
    {
        return $this->belongsTo(TypeFacturation::class);
    }
}
