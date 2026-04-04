<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDiagnosticRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('consultations.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => 'nullable|in:principal,secondaire,differentiel',
            'type_diagnostic_id' => 'nullable|exists:type_diagnostics,id',
            'libelle' => 'required|string|max:255',
            'code_cim' => 'nullable|string|max:20',
            'gravite' => 'nullable|in:legere,moderee,severe,critique',
            'statut' => 'nullable|in:presume,confirme,infirme',
            'description' => 'nullable|string|max:2000',
            'consultation_id' => 'required|exists:consultations,id',
        ];
    }

    public function messages(): array
    {
        return [
            'libelle.required' => 'L\'intitulé du diagnostic est obligatoire.',
            'consultation_id.required' => 'La consultation est obligatoire.',
        ];
    }
}
