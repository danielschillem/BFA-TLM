<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrescriptionMedicamenteux extends Model
{
    protected $table = 'prescription_medicamenteux';

    protected $fillable = [
        'nom_marque', 'nom_generique', 'dose', 'unite',
        'duree', 'voie_administration', 'instructions',
        'statut', 'consequences_statut',
        'prescription_id',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }
}
