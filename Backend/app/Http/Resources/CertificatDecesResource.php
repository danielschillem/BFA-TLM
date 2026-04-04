<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CertificatDecesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $patient = $this->relationLoaded('patient') ? $this->patient : null;

        return [
            'id' => $this->id,
            'numero_certificat' => $this->numero_certificat,
            'statut' => $this->statut,

            // Patient
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'patient_id' => $this->patient_id,
            'dossier_patient_id' => $this->dossier_patient_id,
            'consultation_id' => $this->consultation_id,
            'nom_defunt' => $this->nom_defunt ?? $patient?->nom,
            'prenoms_defunt' => $this->prenoms_defunt ?? $patient?->prenoms,
            'date_naissance_defunt' => $this->date_naissance_defunt?->toDateString() ?? $patient?->date_naissance?->toDateString(),
            'lieu_naissance_defunt' => $this->lieu_naissance_defunt ?? $patient?->lieu_naissance,
            'nationalite_defunt' => $this->nationalite_defunt,
            'profession_defunt' => $this->profession_defunt,
            'adresse_defunt' => $this->adresse_defunt,

            // Circonstances
            'date_deces' => $this->date_deces?->toISOString(),
            'heure_deces' => $this->heure_deces,
            'lieu_deces' => $this->lieu_deces,
            'type_lieu_deces' => $this->type_lieu_deces,
            'sexe_defunt' => $this->sexe_defunt,
            'age_defunt' => $this->age_defunt,
            'unite_age' => $this->unite_age,
            'circonstances_deces' => $this->maniere_deces,

            // Partie I — Chaîne causale (modèle OMS)
            'chaine_causale' => [
                'a' => [
                    'cause' => $this->cause_directe,
                    'code_icd11' => $this->cause_directe_code_icd11,
                    'uri_icd11' => $this->cause_directe_uri_icd11,
                    'delai' => $this->cause_directe_delai,
                ],
                'b' => [
                    'cause' => $this->cause_antecedente_1,
                    'code_icd11' => $this->cause_antecedente_1_code_icd11,
                    'uri_icd11' => $this->cause_antecedente_1_uri_icd11,
                    'delai' => $this->cause_antecedente_1_delai,
                ],
                'c' => [
                    'cause' => $this->cause_antecedente_2,
                    'code_icd11' => $this->cause_antecedente_2_code_icd11,
                    'uri_icd11' => $this->cause_antecedente_2_uri_icd11,
                    'delai' => $this->cause_antecedente_2_delai,
                ],
                'd' => [
                    'cause' => $this->cause_initiale,
                    'code_icd11' => $this->cause_initiale_code_icd11,
                    'uri_icd11' => $this->cause_initiale_uri_icd11,
                    'delai' => $this->cause_initiale_delai,
                ],
            ],
            'cause_directe' => $this->cause_directe,
            'code_icd11_cause_directe' => $this->cause_directe_code_icd11,
            'intervalle_cause_directe' => $this->cause_directe_delai,
            'cause_antecedente_1' => $this->cause_antecedente_1,
            'code_icd11_cause_antecedente_1' => $this->cause_antecedente_1_code_icd11,
            'intervalle_cause_antecedente_1' => $this->cause_antecedente_1_delai,
            'cause_antecedente_2' => $this->cause_antecedente_2,
            'code_icd11_cause_antecedente_2' => $this->cause_antecedente_2_code_icd11,
            'intervalle_cause_antecedente_2' => $this->cause_antecedente_2_delai,
            'cause_initiale' => $this->cause_initiale,
            'code_icd11_cause_initiale' => $this->cause_initiale_code_icd11,
            'intervalle_cause_initiale' => $this->cause_initiale_delai,

            // Partie II
            'autres_etats_morbides' => $this->autres_etats_morbides,
            'autres_etats_morbides_codes_icd11' => $this->autres_etats_morbides_codes_icd11,
            'autres_conditions' => $this->autres_etats_morbides,

            // Circonstances particulières
            'maniere_deces' => $this->maniere_deces,
            'autopsie_pratiquee' => $this->autopsie_pratiquee,
            'resultats_autopsie_disponibles' => $this->resultats_autopsie_disponibles,
            'resultats_autopsie' => $this->resultats_autopsie,

            // Grossesse
            'grossesse_contribue' => $this->grossesse_contribue,
            'statut_grossesse' => $this->statut_grossesse,

            // Chirurgie
            'chirurgie_recente' => $this->chirurgie_recente,
            'date_chirurgie' => $this->date_chirurgie?->toDateString(),
            'raison_chirurgie' => $this->raison_chirurgie,

            // Certification
            'medecin_certificateur' => new UserResource($this->whenLoaded('medecinCertificateur')),
            'medecin' => new UserResource($this->whenLoaded('medecinCertificateur')),
            'date_certification' => $this->date_certification?->toISOString(),
            'validateur' => new UserResource($this->whenLoaded('validateur')),
            'date_validation' => $this->date_validation?->toISOString(),
            'motif_rejet' => $this->motif_rejet,
            'observations' => $this->observations,
            'notes' => $this->observations,

            // Structure
            'structure' => new StructureResource($this->whenLoaded('structure')),
            'structure_id' => $this->structure_id,

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
