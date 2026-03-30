<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Localisation extends Model
{
    protected $fillable = [
        'adresse_1', 'adresse_2', 'code_postal', 'ville',
        'latitude', 'longitude',
        'proprietaire_id', 'proprietaire_type',
    ];

    public function proprietaire()
    {
        return $this->morphTo();
    }
}
