<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRendezVousRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('appointments.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:teleconsultation,presentiel,suivi,urgence'],
            'motif' => ['required', 'string'],
            'date' => ['required', 'date', 'after_or_equal:today'],
            'heure' => ['required', 'date_format:H:i'],
            'priorite' => ['nullable', 'in:normale,haute,urgente'],
            'patient_id' => ['required', 'exists:patients,id'],
            'user_id' => ['nullable', 'exists:users,id'],
            'structure_id' => ['nullable', 'exists:structures,id'],
            'service_id' => ['nullable', 'exists:services,id'],
            'salle_id' => ['nullable', 'exists:salles,id'],
            'acte_ids' => ['required', 'array', 'min:1'],
            'acte_ids.*' => ['exists:actes,id'],
            'assistant_user_ids' => ['nullable', 'array'],
            'assistant_user_ids.*' => ['exists:users,id'],
        ];
    }
}
