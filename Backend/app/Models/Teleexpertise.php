<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Teleexpertise extends Model
{
    protected $fillable = [
        'titre', 'description', 'statut', 'priorite',
        'specialite_demandee', 'resume_clinique', 'question',
        'age_patient', 'genre_patient',
        'reponse', 'recommandations', 'suivi_requis', 'motif_rejet',
        'demandeur_id', 'expert_id', 'patient_id',
    ];

    protected $casts = [
        'suivi_requis' => 'boolean',
    ];

    public function demandeur()
    {
        return $this->belongsTo(User::class, 'demandeur_id');
    }

    public function expert()
    {
        return $this->belongsTo(User::class, 'expert_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
