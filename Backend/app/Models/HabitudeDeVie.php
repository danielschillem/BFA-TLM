<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HabitudeDeVie extends Model
{
    protected $fillable = [
        'type', 'statut', 'details', 'date_debut', 'date_fin',
        'intensite', 'frequence', 'notes',
        'dossier_patient_id', 'consultation_id',
    ];

    protected function casts(): array
    {
        return [
            'date_debut' => 'date',
            'date_fin' => 'date',
        ];
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }
}
