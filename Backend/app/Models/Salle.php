<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Salle extends Model
{
    protected $fillable = ['libelle', 'description', 'capacite', 'equipements', 'actif', 'structure_id', 'type_salle_id'];

    protected function casts(): array
    {
        return [
            'equipements' => 'array',
            'actif' => 'boolean',
        ];
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function typeSalle()
    {
        return $this->belongsTo(TypeSalle::class);
    }
}
