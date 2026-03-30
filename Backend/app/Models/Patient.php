<?php

namespace App\Models;

use App\Services\EncryptionService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Patient extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'ipp', 'nom', 'prenoms', 'date_naissance', 'lieu_naissance', 'sexe',
        'telephone_1', 'telephone_2', 'email', 'photo',
        'nom_personne_prevenir', 'prenom_personne_prevenir',
        'filiation_personne_prevenir', 'telephone_personne_prevenir',
        'localite_id', 'user_id', 'created_by_id', 'structure_id',
    ];

    protected $encryptedFields = ['nom', 'prenoms', 'email'];

    protected static function booted(): void
    {
        static::creating(function (Patient $patient) {
            if (empty($patient->ipp)) {
                $patient->ipp = \App\Services\IdentifierService::generateIPP([
                    $patient->nom,
                    $patient->date_naissance,
                    $patient->sexe,
                ]);
            }
        });
    }

    protected function casts(): array
    {
        return ['date_naissance' => 'date'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnlyDirty();
    }

    // ── Chiffrement automatique ──
    public function setAttribute($key, $value)
    {
        if (in_array($key, $this->encryptedFields) && $value !== null) {
            $value = EncryptionService::encrypt($value);
        }
        return parent::setAttribute($key, $value);
    }

    public function getAttribute($key)
    {
        $value = parent::getAttribute($key);
        if (in_array($key, $this->encryptedFields) && $value !== null) {
            return EncryptionService::decrypt($value);
        }
        return $value;
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->prenoms} {$this->nom}";
    }

    // ── Relations ──
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function localite()
    {
        return $this->belongsTo(Localite::class);
    }

    public function dossier()
    {
        return $this->hasOne(DossierPatient::class);
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class);
    }

    public function anthropometries()
    {
        return $this->hasMany(Anthropometrie::class);
    }

    public function consents()
    {
        return $this->hasMany(PatientConsent::class);
    }

    public function activeConsents()
    {
        return $this->hasMany(PatientConsent::class)->active();
    }
}
