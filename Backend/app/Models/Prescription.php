<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    use HasFactory;

    protected $fillable = [
        'type', 'denomination', 'posologie', 'instructions', 'duree_jours',
        'date_debut', 'date_fin', 'tolerance',
        'statut', 'urgent', 'signee',
        'atc_code', 'atc_display',
        'snomed_code', 'snomed_display',
        'consultation_id', 'dossier_patient_id',
    ];

    protected function casts(): array
    {
        return [
            'urgent' => 'boolean',
            'signee' => 'boolean',
            'date_debut' => 'date',
            'date_fin' => 'date',
        ];
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function medicamenteux()
    {
        return $this->hasMany(PrescriptionMedicamenteux::class);
    }

    public function nonMedicamenteux()
    {
        return $this->hasMany(PrescriptionNonMedicamenteux::class);
    }
}
