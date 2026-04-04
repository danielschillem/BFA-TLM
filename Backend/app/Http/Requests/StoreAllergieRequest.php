<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAllergieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('dossiers.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'allergenes'         => 'required|string|max:255',
            'manifestations'     => 'nullable|string|max:1000',
            'severite'           => 'nullable|in:legere,moderee,severe,critique',
            'dossier_patient_id' => 'required|exists:dossier_patients,id',
            'consultation_id'    => 'nullable|exists:consultations,id',
        ];
    }

    public function messages(): array
    {
        return [
            'allergenes.required'         => 'L\'allergène est obligatoire.',
            'dossier_patient_id.required' => 'Le dossier patient est obligatoire.',
        ];
    }
}
