<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTraitementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'              => 'required|in:medicamenteux,chirurgical,physiotherapie,autre',
            'medicaments'       => 'nullable|string|max:500',
            'dosages'           => 'nullable|string|max:500',
            'posologies'        => 'nullable|string|max:500',
            'duree'             => 'nullable|string|max:100',
            'statut'            => 'nullable|in:en_cours,termine,arrete',
            'diagnostic_id'     => 'required|exists:diagnostics,id',
            'consultation_id'   => 'required|exists:consultations,id',
        ];
    }

    public function messages(): array
    {
        return [
            'type.required'           => 'Le type de traitement est obligatoire.',
            'diagnostic_id.required'  => 'Le diagnostic associé est obligatoire.',
            'consultation_id.required'=> 'La consultation est obligatoire.',
        ];
    }
}
