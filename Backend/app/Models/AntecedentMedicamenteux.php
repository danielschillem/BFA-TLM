<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AntecedentMedicamenteux extends Model
{
    protected $table = 'antecedent_medicamenteux';

    protected $fillable = [
        'nom_marque', 'nom_generique', 'date_debut', 'date_fin',
        'dose', 'unite', 'duree', 'voie_administration', 'tolerance',
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
