<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('messages.send') ?? false;
    }

    public function rules(): array
    {
        return [
            'recipient_id' => 'required|exists:users,id',
            'contenu' => 'required|string|max:5000',
        ];
    }

    public function messages(): array
    {
        return [
            'recipient_id.required' => 'Le destinataire est obligatoire.',
            'contenu.required' => 'Le contenu du message est obligatoire.',
        ];
    }
}
