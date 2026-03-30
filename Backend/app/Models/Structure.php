<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Structure extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = ['code_structure', 'libelle', 'telephone', 'telephone_2', 'email', 'date_creation', 'logo', 'actif', 'localite_id', 'type_structure_id', 'created_by_id', 'parent_id'];

    protected static function booted(): void
    {
        static::creating(function (Structure $structure) {
            if (empty($structure->code_structure)) {
                $structure->code_structure = \App\Services\IdentifierService::generateStructure([
                    $structure->libelle,
                ]);
            }
        });
    }

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnlyDirty();
    }

    public function typeStructure()
    {
        return $this->belongsTo(TypeStructure::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function localite()
    {
        return $this->belongsTo(Localite::class);
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }

    public function salles()
    {
        return $this->hasMany(Salle::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function parent()
    {
        return $this->belongsTo(Structure::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Structure::class, 'parent_id');
    }

    public function dossierPatients()
    {
        return $this->hasMany(DossierPatient::class);
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class);
    }
}
