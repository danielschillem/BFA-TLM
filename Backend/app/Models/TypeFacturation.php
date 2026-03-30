<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TypeFacturation extends Model
{
    protected $fillable = ['libelle', 'description'];

    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }
}
