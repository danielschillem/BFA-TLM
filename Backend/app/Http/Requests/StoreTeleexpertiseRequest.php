<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeleexpertiseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'priorite' => 'nullable|in:basse,normale,haute,urgente,low,normal,high,urgent',
            'specialite_demandee' => 'nullable|string|max:255',
            'resume_clinique' => 'nullable|string|max:5000',
            'question' => 'nullable|string|max:2000',
            'age_patient' => 'nullable|integer|min:0|max:150',
            'genre_patient' => 'nullable|in:M,F',
            'expert_id' => 'nullable|exists:users,id',
            'patient_id' => 'nullable|exists:patients,id',
        ];
    }

    public function messages(): array
    {
        return [
            'titre.required' => 'Le titre de la demande de téléexpertise est obligatoire.',
        ];
    }
}
