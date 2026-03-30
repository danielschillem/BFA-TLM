<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TypeSalle extends Model
{
    protected $fillable = ['libelle', 'description'];

    public function salles()
    {
        return $this->hasMany(Salle::class);
    }
}
