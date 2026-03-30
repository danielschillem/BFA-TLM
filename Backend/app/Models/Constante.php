<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Constante extends Model
{
    protected $fillable = [
        'poids', 'taille', 'imc', 'temperature',
        'tension_systolique', 'tension_diastolique',
        'frequence_cardiaque', 'frequence_respiratoire',
        'saturation_o2', 'glycemie', 'libelle', 'contexte',
        'dossier_patient_id', 'user_id', 'consultation_id',
    ];

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }
}
