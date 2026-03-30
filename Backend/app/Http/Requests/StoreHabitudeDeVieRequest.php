<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHabitudeDeVieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'               => 'required|string|max:100',
            'statut'             => 'nullable|string|max:50',
            'details'            => 'nullable|string|max:2000',
            'date_debut'         => 'nullable|date',
            'date_fin'           => 'nullable|date|after_or_equal:date_debut',
            'intensite'          => 'nullable|string|max:100',
            'frequence'          => 'nullable|string|max:100',
            'notes'              => 'nullable|string|max:2000',
            'dossier_patient_id' => 'required|exists:dossier_patients,id',
            'consultation_id'    => 'nullable|exists:consultations,id',
        ];
    }

    public function messages(): array
    {
        return [
            'type.required'               => 'Le type d\'habitude de vie est obligatoire.',
            'dossier_patient_id.required' => 'Le dossier patient est obligatoire.',
        ];
    }
}
