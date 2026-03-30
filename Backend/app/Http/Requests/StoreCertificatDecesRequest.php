<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCertificatDecesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['nullable', 'exists:patients,id'],
            'dossier_patient_id' => ['nullable', 'exists:dossier_patients,id'],
            'consultation_id' => ['nullable', 'exists:consultations,id'],

            // Circonstances
            'date_deces' => ['required', 'date', 'before_or_equal:now'],
            'heure_deces' => ['nullable', 'date_format:H:i'],
            'lieu_deces' => ['nullable', 'string', 'max:255'],
            'type_lieu_deces' => ['nullable', 'in:hopital,domicile,voie_publique,autre_etablissement,autre'],
            'sexe_defunt' => ['nullable', 'in:M,F'],
            'age_defunt' => ['nullable', 'integer', 'min:0', 'max:150'],
            'unite_age' => ['nullable', 'in:annees,mois,jours,heures'],

            // Partie I — Chaîne causale directe (OMS)
            'cause_directe' => ['required', 'string', 'max:500'],
            'cause_directe_code_icd11' => ['nullable', 'string', 'max:30'],
            'cause_directe_uri_icd11' => ['nullable', 'string', 'max:255'],
            'cause_directe_delai' => ['nullable', 'string', 'max:100'],

            'cause_antecedente_1' => ['nullable', 'string', 'max:500'],
            'cause_antecedente_1_code_icd11' => ['nullable', 'string', 'max:30'],
            'cause_antecedente_1_uri_icd11' => ['nullable', 'string', 'max:255'],
            'cause_antecedente_1_delai' => ['nullable', 'string', 'max:100'],

            'cause_antecedente_2' => ['nullable', 'string', 'max:500'],
            'cause_antecedente_2_code_icd11' => ['nullable', 'string', 'max:30'],
            'cause_antecedente_2_uri_icd11' => ['nullable', 'string', 'max:255'],
            'cause_antecedente_2_delai' => ['nullable', 'string', 'max:100'],

            'cause_initiale' => ['nullable', 'string', 'max:500'],
            'cause_initiale_code_icd11' => ['nullable', 'string', 'max:30'],
            'cause_initiale_uri_icd11' => ['nullable', 'string', 'max:255'],
            'cause_initiale_delai' => ['nullable', 'string', 'max:100'],

            // Partie II
            'autres_etats_morbides' => ['nullable', 'string', 'max:2000'],
            'autres_etats_morbides_codes_icd11' => ['nullable', 'string', 'max:500'],

            // Circonstances particulières
            'maniere_deces' => ['nullable', 'in:naturelle,accident,suicide,homicide,indeterminee,en_attente_enquete'],
            'autopsie_pratiquee' => ['nullable', 'boolean'],
            'resultats_autopsie_disponibles' => ['nullable', 'boolean'],
            'resultats_autopsie' => ['nullable', 'string', 'max:5000'],

            // Grossesse
            'grossesse_contribue' => ['nullable', 'boolean'],
            'statut_grossesse' => ['nullable', 'in:non_applicable,non_enceinte,enceinte,moins_42_jours_postpartum,43_jours_a_1_an_postpartum'],

            // Chirurgie
            'chirurgie_recente' => ['nullable', 'boolean'],
            'date_chirurgie' => ['nullable', 'date', 'before_or_equal:now'],
            'raison_chirurgie' => ['nullable', 'string', 'max:500'],

            // Observations
            'observations' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'patient_id.required' => 'Le patient décédé est obligatoire.',
            'date_deces.required' => 'La date du décès est obligatoire.',
            'date_deces.before_or_equal' => 'La date du décès ne peut pas être dans le futur.',
            'cause_directe.required' => 'La cause directe du décès (ligne a) est obligatoire.',
        ];
    }
}
