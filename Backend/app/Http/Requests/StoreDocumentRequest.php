<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('documents.upload') ?? false;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,gif,bmp,tiff,doc,docx,xls,xlsx,csv,txt,rtf,odt,ods,zip', // 10 MB max — types autorisés uniquement
            'titre' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'niveau_confidentialite' => 'nullable|in:normal,confidentiel,tres_confidentiel',
            'documentable_id' => 'nullable|integer',
            'documentable_type' => 'nullable|string|in:consultation,examen,traitement',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Le fichier est obligatoire.',
            'file.max' => 'Le fichier ne doit pas dépasser 10 Mo.',
        ];
    }
}
