<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Anthropometrie extends Model
{
    protected $fillable = [
        'taille', 'poids', 'imc',
        'consultation_id', 'patient_id',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
