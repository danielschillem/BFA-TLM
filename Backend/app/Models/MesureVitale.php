<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MesureVitale extends Model
{
    protected $fillable = [
        'type', 'valeur', 'valeur_2', 'unite', 'meta_json',
        'session_mesure_vitale_id',
    ];

    protected function casts(): array
    {
        return ['meta_json' => 'array'];
    }

    public function session()
    {
        return $this->belongsTo(SessionMesureVitale::class, 'session_mesure_vitale_id');
    }
}
