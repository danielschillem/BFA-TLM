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
        $isPatient = $this->user()?->hasRole('patient');

        return [
            'type' => ['required', 'in:teleconsultation,presentiel,suivi,urgence'],
            'motif' => ['required', 'string'],
            'date' => ['required', 'date', 'after_or_equal:today'],
            'heure' => ['required', 'date_format:H:i'],
            'priorite' => ['nullable', 'in:normale,haute,urgente'],
            // patient_id auto-rempli pour les patients autonomes
            'patient_id' => [$isPatient ? 'nullable' : 'required', 'exists:patients,id'],
            'user_id' => ['nullable', 'exists:users,id', function ($attribute, $value, $fail) {
                if ($value) {
                    $target = \App\Models\User::find($value);
                    if (!$target || !$target->hasAnyRole(['doctor', 'specialist', 'health_professional'])) {
                        $fail('Le médecin sélectionné doit être un professionnel de santé.');
                    }
                }
            }],
            'structure_id' => ['nullable', 'exists:structures,id'],
            'service_id' => ['nullable', 'exists:services,id'],
            'salle_id' => ['nullable', 'exists:salles,id'],
            'acte_ids' => [$isPatient ? 'nullable' : 'required', 'array'],
            'acte_ids.*' => ['exists:actes,id'],
            'assistant_user_ids' => ['nullable', 'array'],
            'assistant_user_ids.*' => ['exists:users,id'],
        ];
    }
}
