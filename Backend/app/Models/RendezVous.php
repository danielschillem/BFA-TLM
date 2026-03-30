<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class RendezVous extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'rendez_vous';

    protected $fillable = [
        'type', 'motif', 'date', 'heure', 'priorite', 'statut',
        'room_name', 'resume', 'type_resume', 'motif_annulation', 'date_annulation',
        'patient_id', 'dossier_patient_id', 'user_id', 'created_by_doctor_id',
        'structure_id', 'service_id', 'salle_id', 'type_facturation_id',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['statut', 'date', 'heure', 'type'])
            ->logOnlyDirty();
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function createdByDoctor()
    {
        return $this->belongsTo(User::class, 'created_by_doctor_id');
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function salle()
    {
        return $this->belongsTo(Salle::class);
    }

    public function actes()
    {
        return $this->belongsToMany(Acte::class, 'acte_rendez_vous');
    }

    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }

    public function consultation()
    {
        return $this->hasOne(Consultation::class);
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function typeFacturation()
    {
        return $this->belongsTo(TypeFacturation::class);
    }

    public function invites()
    {
        return $this->belongsToMany(User::class, 'rendez_vous_invite');
    }
}
