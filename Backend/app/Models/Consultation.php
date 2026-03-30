<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Consultation extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'motif_principal', 'histoire_maladie_symptomes',
        'conclusion_medicale', 'conduite_a_tenir',
        'date', 'observation', 'statut', 'type', 'type_suivi',
        'dossier_patient_id', 'rendez_vous_id', 'user_id',
        'video_rating', 'video_rating_comment', 'video_rated_by',
    ];

    protected function casts(): array
    {
        return ['date' => 'datetime'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['statut', 'date'])
            ->logOnlyDirty();
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
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

    public function traitements()
    {
        return $this->hasMany(Traitement::class);
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function examenClinique()
    {
        return $this->hasOne(ExamenClinique::class);
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

    public function antecedents()
    {
        return $this->hasMany(Antecedent::class);
    }

    public function anthropometries()
    {
        return $this->hasMany(Anthropometrie::class);
    }

    public function sessionsMesureVitale()
    {
        return $this->hasMany(SessionMesureVitale::class);
    }
}
