<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class LicenseModule extends Model
{
    use LogsActivity;

    protected $fillable = [
        'code', 'libelle', 'description', 'prix_unitaire_fcfa', 'inclus_base', 'actif',
    ];

    protected function casts(): array
    {
        return [
            'prix_unitaire_fcfa' => 'integer',
            'inclus_base'        => 'boolean',
            'actif'              => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnlyDirty();
    }

    public function licenses()
    {
        return $this->belongsToMany(License::class, 'license_license_module')
                    ->withTimestamps();
    }
}
