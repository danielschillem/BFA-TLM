<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'titre',
        'contenu',
        'type',
        'statut',
        'date_publication',
        'date_expiration',
        'auteur_id',
    ];

    protected $casts = [
        'date_publication' => 'datetime',
        'date_expiration'  => 'datetime',
    ];

    public function auteur()
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    public function scopePublished($query)
    {
        return $query->where('statut', 'publie')
            ->where('date_publication', '<=', now())
            ->where(function ($q) {
                $q->whereNull('date_expiration')
                  ->orWhere('date_expiration', '>=', now());
            });
    }
}
