<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenClinique extends Model
{
    protected $fillable = [
        'synthese_globale',
        'consultation_id', 'dossier_patient_id', 'user_id',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function systemes()
    {
        return $this->hasMany(ExamenCliniqueSysteme::class);
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
