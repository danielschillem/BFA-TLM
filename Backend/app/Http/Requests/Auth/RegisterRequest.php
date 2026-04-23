<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom' => ['required', 'string', 'max:255'],
            'prenoms' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(12)->mixedCase()->numbers()->symbols()->uncompromised(),
            ],
            'telephone_1' => ['nullable', 'string', 'max:20'],
            'sexe' => ['nullable', 'in:M,F'],
            // L'inscription publique est réservée aux patients uniquement.
            // Les PS, gestionnaires et admins sont créés via le workflow hiérarchique.
            'role' => ['nullable', 'string', 'in:patient'],
        ];
    }
}
