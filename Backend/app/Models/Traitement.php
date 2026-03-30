<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Traitement extends Model
{
    protected $fillable = [
        'type', 'medicaments', 'dosages', 'posologies',
        'duree', 'statut', 'diagnostic_id', 'consultation_id',
        'atc_code', 'atc_display',
        'snomed_code', 'snomed_display',
    ];

    public function diagnostic()
    {
        return $this->belongsTo(Diagnostic::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
