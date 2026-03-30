<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TypeProfessionnelSante extends Model
{
    protected $fillable = ['libelle', 'description'];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
