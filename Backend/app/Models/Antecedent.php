<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Antecedent extends Model
{
    protected $fillable = [
        'libelle', 'code_cim', 'description', 'type',
        'date_evenement', 'resolution', 'filiation',
        'date_naissance_parent', 'date_deces_parent',
        'traitements', 'etat_actuel',
        'dossier_patient_id', 'user_id', 'consultation_id',
        'code_icd11', 'titre_icd11', 'uri_icd11',
        'snomed_code', 'snomed_display',
    ];

    protected function casts(): array
    {
        return [
            'date_evenement' => 'date',
            'date_naissance_parent' => 'date',
            'date_deces_parent' => 'date',
        ];
    }

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
