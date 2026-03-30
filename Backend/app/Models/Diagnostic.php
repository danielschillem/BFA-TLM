<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Diagnostic extends Model
{
    protected $fillable = [
        'type', 'type_diagnostic_id', 'libelle', 'code_cim', 'gravite',
        'statut', 'description', 'consultation_id', 'dossier_patient_id',
        'code_icd11', 'titre_icd11', 'uri_icd11',
        'snomed_code', 'snomed_display',
    ];

    public function typeDiagnostic()
    {
        return $this->belongsTo(TypeDiagnostic::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function traitements()
    {
        return $this->hasMany(Traitement::class);
    }
}
