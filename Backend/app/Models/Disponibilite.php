<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Disponibilite extends Model
{
    protected $fillable = [
        'user_id', 'jour_semaine', 'date_specifique',
        'heure_debut', 'heure_fin', 'type_consultation',
        'duree_creneau', 'tarif', 'actif', 'structure_id',
    ];

    protected function casts(): array
    {
        return [
            'date_specifique' => 'date',
            'actif' => 'boolean',
            'tarif' => 'decimal:2',
            'duree_creneau' => 'integer',
            'jour_semaine' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    /**
     * Scope: disponibilités actives pour un médecin à une date donnée.
     * Prend en compte les disponibilités spécifiques ET récurrentes.
     */
    public function scopeForDoctorOnDate($query, int $doctorId, string $date)
    {
        $dayOfWeek = (int) date('w', strtotime($date)); // 0=dim, 6=sam

        return $query->where('user_id', $doctorId)
            ->where('actif', true)
            ->where(function ($q) use ($date, $dayOfWeek) {
                // Disponibilité spécifique à cette date (prioritaire)
                $q->where('date_specifique', $date)
                  // OU récurrente pour ce jour de la semaine
                  ->orWhere(function ($q2) use ($dayOfWeek, $date) {
                      $q2->whereNull('date_specifique')
                         ->where('jour_semaine', $dayOfWeek);
                  });
            });
    }

    /**
     * Génère les créneaux horaires à partir de cette disponibilité.
     */
    public function generateSlots(): array
    {
        $slots = [];
        $start = strtotime($this->heure_debut);
        $end = strtotime($this->heure_fin);
        $duration = $this->duree_creneau * 60; // en secondes

        while ($start + $duration <= $end) {
            $slots[] = date('H:i', $start);
            $start += $duration;
        }

        return $slots;
    }
}
