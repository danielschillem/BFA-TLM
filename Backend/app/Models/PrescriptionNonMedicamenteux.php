<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrescriptionNonMedicamenteux extends Model
{
    protected $table = 'prescription_non_medicamenteux';

    protected $fillable = [
        'description', 'resultat',
        'prescription_id',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }
}
