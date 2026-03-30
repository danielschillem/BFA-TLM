<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    protected $fillable = [
        'type', 'type_examen_id', 'libelle', 'indication',
        'date_demande', 'date_examen', 'date_reception_resultat',
        'resultats', 'commentaire', 'statut', 'urgent',
        'snomed_code', 'snomed_display',
        'loinc_code', 'loinc_display',
        'consultation_id', 'dossier_patient_id',
    ];

    protected function casts(): array
    {
        return [
            'urgent' => 'boolean',
            'date_demande' => 'date',
            'date_examen' => 'date',
            'date_reception_resultat' => 'date',
        ];
    }

    public function typeExamen()
    {
        return $this->belongsTo(TypeExamen::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
