<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('prescriptions.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'denomination' => 'required|string|max:255',
            'posologie' => 'nullable|string|max:500',
            'instructions' => 'nullable|string|max:1000',
            'duree_jours' => 'nullable|integer|min:1|max:365',
            'urgent' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'denomination.required' => 'Le nom du médicament est obligatoire.',
            'duree_jours.min' => 'La durée doit être d\'au moins 1 jour.',
        ];
    }
}
