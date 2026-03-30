<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SessionMesureVitale extends Model
{
    protected $fillable = [
        'date_mesure', 'contexte', 'notes',
        'dossier_patient_id', 'consultation_id', 'user_id',
    ];

    protected function casts(): array
    {
        return ['date_mesure' => 'datetime'];
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function mesures()
    {
        return $this->hasMany(MesureVitale::class);
    }
}
