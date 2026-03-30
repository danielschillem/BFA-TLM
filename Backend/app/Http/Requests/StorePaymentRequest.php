<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:0',
            'method' => 'required|string|in:orange_money,moov_money,card,carte,cash,especes',
            'phone' => 'nullable|string|max:20',
            'billing_type_id' => 'nullable|exists:type_facturations,id',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Le montant est obligatoire.',
            'method.required' => 'La méthode de paiement est obligatoire.',
            'method.in' => 'Méthode de paiement invalide.',
        ];
    }
}
