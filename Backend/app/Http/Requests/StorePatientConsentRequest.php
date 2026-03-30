<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePatientConsentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:teleconsultation,donnees_medicales,partage_dossier,traitement,recherche'],
            'texte_consentement' => ['required', 'string', 'max:10000'],
            'accepted' => ['required', 'boolean'],
            'patient_id' => ['required', 'exists:patients,id'],
            'consultation_id' => ['nullable', 'exists:consultations,id'],
            'rendez_vous_id' => ['nullable', 'exists:rendez_vous,id'],

            // Proxy / tuteur
            'is_proxy' => ['nullable', 'boolean'],
            'proxy_nom' => ['required_if:is_proxy,true', 'nullable', 'string', 'max:255'],
            'proxy_lien' => ['required_if:is_proxy,true', 'nullable', 'string', 'max:255'],
            'proxy_piece_identite' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in' => 'Le type de consentement doit être : teleconsultation, donnees_medicales, partage_dossier, traitement ou recherche.',
            'proxy_nom.required_if' => 'Le nom du tuteur est requis pour un consentement par proxy.',
            'proxy_lien.required_if' => 'Le lien de parenté / qualité juridique est requis pour un consentement par proxy.',
        ];
    }
}
