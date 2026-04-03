<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('consultations.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => 'nullable|string|max:100',
            'type_examen_id' => 'nullable|exists:type_examens,id',
            'libelle' => 'required|string|max:255',
            'indication' => 'nullable|string|max:1000',
            'urgent' => 'nullable|boolean',
            'consultation_id' => 'required|exists:consultations,id',
        ];
    }

    public function messages(): array
    {
        return [
            'libelle.required' => 'L\'intitulé de l\'examen est obligatoire.',
            'consultation_id.required' => 'La consultation est obligatoire.',
        ];
    }
}
