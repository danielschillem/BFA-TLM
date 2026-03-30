<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'titre', 'type', 'description', 'chemin_fichier', 'nom_fichier_original',
        'type_mime', 'taille_octets', 'date_document',
        'niveau_confidentialite', 'verifie', 'verifie_par_user_id', 'date_verification',
        'documentable_id', 'documentable_type', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'verifie' => 'boolean',
            'date_document' => 'date',
            'date_verification' => 'datetime',
        ];
    }

    public function documentable()
    {
        return $this->morphTo();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function verifiePar()
    {
        return $this->belongsTo(User::class, 'verifie_par_user_id');
    }
}
