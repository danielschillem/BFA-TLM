<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DossierPatient extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'identifiant', 'statut', 'groupe_sanguin', 'notes_importantes',
        'nb_consultations', 'nb_hospitalisations',
        'date_ouverture', 'date_derniere_consultation', 'date_fermeture',
        'patient_id', 'structure_id', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'date_ouverture' => 'date',
            'date_derniere_consultation' => 'date',
            'date_fermeture' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (DossierPatient $dossier) {
            if (empty($dossier->identifiant) || !str_starts_with($dossier->identifiant, 'BFA-LPK')) {
                $dossier->identifiant = \App\Services\IdentifierService::generateDossier([
                    $dossier->patient_id,
                ]);
            }
        });
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnlyDirty();
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function consultations()
    {
        return $this->hasMany(Consultation::class);
    }

    public function antecedents()
    {
        return $this->hasMany(Antecedent::class);
    }

    public function constantes()
    {
        return $this->hasMany(Constante::class);
    }

    public function diagnostics()
    {
        return $this->hasMany(Diagnostic::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }

    public function examens()
    {
        return $this->hasMany(Examen::class);
    }

    public function acces()
    {
        return $this->hasMany(DossierAcces::class);
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function allergies()
    {
        return $this->hasMany(Allergie::class);
    }

    public function habitudesDeVie()
    {
        return $this->hasMany(HabitudeDeVie::class);
    }

    public function antecedentsMedicamenteux()
    {
        return $this->hasMany(AntecedentMedicamenteux::class);
    }

    public function sessionsMesureVitale()
    {
        return $this->hasMany(SessionMesureVitale::class);
    }

    public function examensCliniques()
    {
        return $this->hasMany(ExamenClinique::class);
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class);
    }
}
