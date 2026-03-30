<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DicomStudy extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'study_instance_uid',
        'accession_number',
        'study_id',
        'study_description',
        'modality',
        'body_part_examined',
        'study_date',
        'patient_dicom_id',
        'patient_dicom_name',
        'number_of_series',
        'number_of_instances',
        'statut',
        'referring_physician',
        'interpretation',
        'patient_id',
        'examen_id',
        'consultation_id',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'study_date' => 'datetime',
            'number_of_series' => 'integer',
            'number_of_instances' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnlyDirty()
            ->logOnly(['statut', 'interpretation', 'patient_id', 'examen_id']);
    }

    // ── Relations ──

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function examen()
    {
        return $this->belongsTo(Examen::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // ── Helpers ──

    /**
     * URL WADO-RS pour récupérer l'étude complète depuis dcm4chee-arc.
     */
    public function getWadoRsUrlAttribute(): string
    {
        $base = rtrim(config('services.dcm4chee.base_url'), '/');
        $wado = config('services.dcm4chee.wado_rs');

        return "{$base}{$wado}/studies/{$this->study_instance_uid}";
    }

    /**
     * URL du viewer OHIF intégré (si configuré).
     */
    public function getViewerUrlAttribute(): ?string
    {
        $ohifBase = config('services.dcm4chee.ohif_viewer_url');
        if (!$ohifBase) {
            return null;
        }

        return "{$ohifBase}/viewer?StudyInstanceUIDs={$this->study_instance_uid}";
    }

    /**
     * Libellé lisible de la modalité DICOM.
     */
    public function getModalityLabelAttribute(): string
    {
        $labels = [
            'CR' => 'Radiographie numérique',
            'CT' => 'Scanner (TDM)',
            'MR' => 'IRM',
            'US' => 'Échographie',
            'XA' => 'Angiographie',
            'DX' => 'Radiographie digitale',
            'MG' => 'Mammographie',
            'NM' => 'Médecine nucléaire',
            'PT' => 'TEP (PET)',
            'RF' => 'Radioscopie',
            'OT' => 'Autre',
        ];

        return $labels[$this->modality] ?? $this->modality ?? 'Inconnu';
    }
}
