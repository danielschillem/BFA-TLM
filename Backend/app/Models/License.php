<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class License extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'license_key', 'structure_id', 'type', 'statut',
        'type_centre', 'capacite_lits', 'max_utilisateurs', 'nombre_sites',
        'zone_sanitaire', 'pays',
        'montant_base_fcfa', 'montant_modules_fcfa', 'montant_total_fcfa',
        'date_debut', 'date_fin', 'date_renouvellement',
        'notes', 'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'date_debut'          => 'date',
            'date_fin'            => 'date',
            'date_renouvellement' => 'date',
            'capacite_lits'       => 'integer',
            'max_utilisateurs'    => 'integer',
            'nombre_sites'        => 'integer',
            'montant_base_fcfa'   => 'integer',
            'montant_modules_fcfa'=> 'integer',
            'montant_total_fcfa'  => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnlyDirty();
    }

    // ── Relations ───────────────────────────────────────────────────────────

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function modules()
    {
        return $this->belongsToMany(LicenseModule::class, 'license_license_module')
                    ->withTimestamps();
    }

    // ── Scopes ──────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('statut', 'active')
                     ->where('date_fin', '>=', now()->toDateString());
    }

    public function scopeDemo($query)
    {
        return $query->where('type', 'demo');
    }

    public function scopeForStructure($query, int $structureId)
    {
        return $query->where('structure_id', $structureId);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->statut === 'active' && $this->date_fin->gte(now()->startOfDay());
    }

    public function isDemo(): bool
    {
        return $this->type === 'demo';
    }

    public function joursRestants(): int
    {
        return max(0, (int) now()->startOfDay()->diffInDays($this->date_fin, false));
    }

    public function hasModule(string $code): bool
    {
        return $this->modules->contains('code', $code);
    }
}
