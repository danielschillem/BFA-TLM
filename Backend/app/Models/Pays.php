<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pays extends Model
{
    protected $fillable = ['nom', 'code', 'indicatif'];

    public function localites()
    {
        return $this->hasMany(Localite::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
