<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Acte extends Model
{
    use HasFactory;

    protected $fillable = ['libelle', 'cout', 'description', 'duree', 'type_acte_id', 'snomed_code', 'snomed_display'];

    public function typeActe()
    {
        return $this->belongsTo(TypeActe::class);
    }

    public function rendezVous()
    {
        return $this->belongsToMany(RendezVous::class, 'acte_rendez_vous');
    }
}
