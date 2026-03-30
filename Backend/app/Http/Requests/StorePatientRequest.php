<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'nom' => [$required, 'string', 'max:255'],
            'prenoms' => [$required, 'string', 'max:255'],
            'sexe' => [$required, 'in:M,F'],
            'date_naissance' => [$required, 'date'],
            'lieu_naissance' => [$required, 'string', 'max:255'],
            'telephone_1' => [$required, 'string', 'max:20'],
            'telephone_2' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'localite_id' => ['nullable', 'exists:localites,id'],
            'nom_personne_prevenir' => [$required, 'string', 'max:255'],
            'filiation_personne_prevenir' => [$required, 'string', 'max:255'],
            'telephone_personne_prevenir' => [$required, 'string', 'max:20'],
        ];
    }
}
