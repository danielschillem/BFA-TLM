<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TypeStructure extends Model
{
    use LogsActivity;

    protected $fillable = ['libelle', 'description', 'actif'];

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnlyDirty();
    }

    public function structures()
    {
        return $this->hasMany(Structure::class);
    }
}
