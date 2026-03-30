<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PatientConsent extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'type',
        'version',
        'texte_consentement',
        'accepted',
        'accepted_at',
        'revoked_at',
        'motif_revocation',
        'is_proxy',
        'proxy_nom',
        'proxy_lien',
        'proxy_piece_identite',
        'patient_id',
        'user_id',
        'revoked_by',
        'consultation_id',
        'rendez_vous_id',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'accepted' => 'boolean',
            'is_proxy' => 'boolean',
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
            'version' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnlyDirty()
            ->logOnly([
                'type', 'accepted', 'accepted_at',
                'revoked_at', 'motif_revocation', 'is_proxy',
            ]);
    }

    // ── Scopes ──

    public function scopeActive($query)
    {
        return $query->where('accepted', true)->whereNull('revoked_at');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeForPatient($query, int $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    // ── Accessors ──

    public function getIsActiveAttribute(): bool
    {
        return $this->accepted && is_null($this->revoked_at);
    }

    // ── Relations ──

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function revokedByUser()
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class);
    }
}
