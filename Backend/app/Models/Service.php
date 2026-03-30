<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Service extends Model
{
    use SoftDeletes;

    protected $fillable = ['libelle', 'code', 'telephone', 'telephone_2', 'email', 'actif', 'structure_id'];

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function professionnels()
    {
        return $this->belongsToMany(User::class, 'service_user');
    }
}
