<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TypeExamen extends Model
{
    protected $fillable = ['libelle', 'description'];

    public function examens()
    {
        return $this->hasMany(Examen::class, 'type_examen_id');
    }
}
