<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAntecedentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'libelle'            => 'required|string|max:255',
            'type'               => 'required|in:medical,chirurgical,familial,allergie,autre',
            'code_cim'           => 'nullable|string|max:20',
            'description'        => 'nullable|string|max:2000',
            'date_evenement'     => 'nullable|date',
            'resolution'         => 'nullable|string|max:2000',
            'filiation'          => 'nullable|string|max:100',
            'traitements'        => 'nullable|string|max:2000',
            'etat_actuel'        => 'nullable|string|max:500',
            'dossier_patient_id' => 'required|exists:dossier_patients,id',
            'consultation_id'    => 'nullable|exists:consultations,id',
        ];
    }

    public function messages(): array
    {
        return [
            'libelle.required'            => 'L\'intitulé de l\'antécédent est obligatoire.',
            'type.required'               => 'Le type d\'antécédent est obligatoire.',
            'dossier_patient_id.required' => 'Le dossier patient est obligatoire.',
        ];
    }
}
