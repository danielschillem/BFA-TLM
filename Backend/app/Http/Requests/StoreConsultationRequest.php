<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('consultations.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'motif_principal' => ['nullable', 'string'],
            'observation' => ['nullable', 'string'],
            'type_suivi' => ['nullable', 'in:initial,suivi,urgence,controle'],
            'dossier_patient_id' => ['required', 'exists:dossier_patients,id'],
            'rendez_vous_id' => ['nullable', 'exists:rendez_vous,id'],
        ];
    }
}
