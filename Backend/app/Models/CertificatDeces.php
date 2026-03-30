<?php

namespace App\Models;

use App\Services\IdentifierService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CertificatDeces extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'certificat_deces';

    protected $fillable = [
        'numero_certificat', 'patient_id', 'dossier_patient_id',
        // Circonstances
        'date_deces', 'heure_deces', 'lieu_deces', 'type_lieu_deces',
        'sexe_defunt', 'age_defunt', 'unite_age',
        // Partie I — Chaîne causale
        'cause_directe', 'cause_directe_code_icd11', 'cause_directe_uri_icd11', 'cause_directe_delai',
        'cause_antecedente_1', 'cause_antecedente_1_code_icd11', 'cause_antecedente_1_uri_icd11', 'cause_antecedente_1_delai',
        'cause_antecedente_2', 'cause_antecedente_2_code_icd11', 'cause_antecedente_2_uri_icd11', 'cause_antecedente_2_delai',
        'cause_initiale', 'cause_initiale_code_icd11', 'cause_initiale_uri_icd11', 'cause_initiale_delai',
        // Partie II
        'autres_etats_morbides', 'autres_etats_morbides_codes_icd11',
        // Circonstances particulières
        'maniere_deces', 'autopsie_pratiquee', 'resultats_autopsie_disponibles', 'resultats_autopsie',
        // Grossesse / chirurgie
        'grossesse_contribue', 'statut_grossesse', 'chirurgie_recente', 'date_chirurgie', 'raison_chirurgie',
        // Certification
        'statut', 'medecin_certificateur_id', 'date_certification',
        'validateur_id', 'date_validation', 'motif_rejet', 'observations',
        // Structure
        'structure_id', 'consultation_id',
    ];

    protected function casts(): array
    {
        return [
            'date_deces' => 'datetime',
            'date_certification' => 'datetime',
            'date_validation' => 'datetime',
            'date_chirurgie' => 'date',
            'autopsie_pratiquee' => 'boolean',
            'resultats_autopsie_disponibles' => 'boolean',
            'grossesse_contribue' => 'boolean',
            'chirurgie_recente' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['statut', 'cause_directe', 'cause_directe_code_icd11', 'date_certification'])
            ->logOnlyDirty();
    }

    // ── Génération automatique du numéro ──────────────────────────

    protected static function booted(): void
    {
        static::creating(function (CertificatDeces $certificat) {
            if (empty($certificat->numero_certificat)) {
                $certificat->numero_certificat = IdentifierService::generate(
                    'DCD',
                    [$certificat->patient_id, $certificat->date_deces],
                    'certificat_deces',
                    'numero_certificat'
                );
            }
        });
    }

    // ── Relations ─────────────────────────────────────────────────

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function dossierPatient()
    {
        return $this->belongsTo(DossierPatient::class);
    }

    public function medecinCertificateur()
    {
        return $this->belongsTo(User::class, 'medecin_certificateur_id');
    }

    public function validateur()
    {
        return $this->belongsTo(User::class, 'validateur_id');
    }

    public function structure()
    {
        return $this->belongsTo(Structure::class);
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    // ── Scopes ────────────────────────────────────────────────────

    public function scopeBrouillons($query)
    {
        return $query->where('statut', 'brouillon');
    }

    public function scopeCertifies($query)
    {
        return $query->where('statut', 'certifie');
    }

    public function scopeValides($query)
    {
        return $query->where('statut', 'valide');
    }

    public function scopeByPeriode($query, string $debut, string $fin)
    {
        return $query->whereBetween('date_deces', [$debut, $fin]);
    }

    public function scopeByStructure($query, int $structureId)
    {
        return $query->where('structure_id', $structureId);
    }

    // ── Helpers ───────────────────────────────────────────────────

    public function getChaîneCausaleAttribute(): array
    {
        $chain = [];

        $chain[] = [
            'ligne' => 'a',
            'cause' => $this->cause_directe,
            'code_icd11' => $this->cause_directe_code_icd11,
            'delai' => $this->cause_directe_delai,
        ];

        if ($this->cause_antecedente_1) {
            $chain[] = [
                'ligne' => 'b',
                'cause' => $this->cause_antecedente_1,
                'code_icd11' => $this->cause_antecedente_1_code_icd11,
                'delai' => $this->cause_antecedente_1_delai,
            ];
        }

        if ($this->cause_antecedente_2) {
            $chain[] = [
                'ligne' => 'c',
                'cause' => $this->cause_antecedente_2,
                'code_icd11' => $this->cause_antecedente_2_code_icd11,
                'delai' => $this->cause_antecedente_2_delai,
            ];
        }

        if ($this->cause_initiale) {
            $chain[] = [
                'ligne' => 'd',
                'cause' => $this->cause_initiale,
                'code_icd11' => $this->cause_initiale_code_icd11,
                'delai' => $this->cause_initiale_delai,
            ];
        }

        return $chain;
    }

    public function estCertifie(): bool
    {
        return in_array($this->statut, ['certifie', 'valide']);
    }
}
