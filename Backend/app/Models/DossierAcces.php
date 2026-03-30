<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DossierAcces extends Model
{
    protected $table = 'dossier_acces';

    protected $fillable = [
        'niveau_acces', 'date_debut_acces', 'date_fin_acces',
        'motif_acces', 'acces_actif', 'motif_revocation',
        'dossier_patient_id', 'user_id', 'autorise_par',
    ];

    protected function casts(): array
    {
        return [
            'date_debut_acces' => 'datetime',
            'date_fin_acces' => 'datetime',
            'acces_actif' => 'boolean',
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

    public function autorisePar()
    {
        return $this->belongsTo(User::class, 'autorise_par');
    }
}
