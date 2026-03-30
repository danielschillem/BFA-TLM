<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenCliniqueSysteme extends Model
{
    protected $fillable = [
        'systeme', 'description', 'impression',
        'examen_clinique_id',
    ];

    public function examenClinique()
    {
        return $this->belongsTo(ExamenClinique::class);
    }
}
