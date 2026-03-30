<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Allergie extends Model
{
    protected $fillable = [
        'allergenes', 'manifestations', 'severite',
        'dossier_patient_id', 'consultation_id',
    ];

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }
}
