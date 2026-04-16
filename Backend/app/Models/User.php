<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasRoles, LogsActivity, SoftDeletes;

    protected $guard_name = 'web';

    protected $fillable = [
        'identifiant_national', 'nom', 'prenoms', 'email', 'password',
        'telephone_1', 'telephone_2', 'sexe',
        'lieu_naissance', 'date_naissance',
        'specialite', 'matricule', 'numero_ordem', 'photo', 'status',
        'last_login_at', 'last_activity_at',
        'two_factor_code', 'two_factor_expires_at',
        'pays_id', 'localite_id', 'grade_id',
        'type_professionnel_sante_id', 'structure_id', 'service_id',
        'created_by_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->identifiant_national)) {
                $type = $user->specialite
                    ? \App\Services\IdentifierService::TYPE_PS
                    : \App\Services\IdentifierService::TYPE_USER;
                $user->identifiant_national = \App\Services\IdentifierService::generate(
                    $type,
                    [$user->nom, $user->prenoms, $user->email],
                    'users',
                    'identifiant_national'
                );
            }
        });
    }

    protected $hidden = [
        'password', 'remember_token', 'two_factor_code',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'date_naissance' => 'date',
            'two_factor_expires_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nom', 'prenoms', 'email', 'status'])
            ->logOnlyDirty();
    }

    // ── Accessors ──────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return "{$this->prenoms} {$this->nom}";
    }

    // ── Relations ──────────────────────────────────────────────

    public function pays()
    {
        return $this->belongsTo(Pays::class);
    }

    public function localite()
    {
        return $this->belongsTo(Localite::class);
    }

    public function grade()
    {
        return $this->belongsTo(Grade::class);
    }

    public function typeProfessionnelSante()
    {
        return $this->belongsTo(TypeProfessionnelSante::class);
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function createdUsers()
    {
        return $this->hasMany(User::class, 'created_by_id');
    }

    public function createdPatients()
    {
        return $this->hasMany(Patient::class, 'created_by_id');
    }

    /**
     * Le dossier patient lié à cet utilisateur (pour les utilisateurs avec rôle patient).
     */
    public function patient()
    {
        return $this->hasOne(Patient::class);
    }

    public function services()
    {
        return $this->belongsToMany(Service::class, 'service_user');
    }

    public function rendezVousInvite()
    {
        return $this->belongsToMany(RendezVous::class, 'rendez_vous_invite');
    }

    public function consultations()
    {
        return $this->hasMany(Consultation::class);
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class);
    }

    public function messagesSent()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function messagesReceived()
    {
        return $this->hasMany(Message::class, 'recipient_id');
    }
}
