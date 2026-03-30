<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeleexpertiseRequest extends FormRequest
{
    private const PRIORITY_MAP = [
        'basse' => 'low',
        'low' => 'low',
        'normale' => 'normal',
        'normal' => 'normal',
        'haute' => 'high',
        'high' => 'high',
        'urgente' => 'urgent',
        'urgent' => 'urgent',
    ];

    private const GENDER_MAP = [
        'M' => 'male',
        'F' => 'female',
        'male' => 'male',
        'female' => 'female',
        'other' => 'other',
    ];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $priority = $this->input('urgency_level', $this->input('priorite'));
        $gender = $this->input('patient_gender', $this->input('genre_patient'));

        $this->merge([
            'title' => $this->input('title', $this->input('titre')),
            'clinical_summary' => $this->input('clinical_summary', $this->input('resume_clinique', $this->input('description'))),
            'specialty_requested' => $this->input('specialty_requested', $this->input('specialite_demandee')),
            'urgency_level' => self::PRIORITY_MAP[$priority] ?? $priority,
            'specialist_id' => $this->input('specialist_id', $this->input('expert_id')),
            'patient_age' => $this->input('patient_age', $this->input('age_patient')),
            'patient_gender' => self::GENDER_MAP[$gender] ?? $gender,
        ]);
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'clinical_summary' => 'required|string|max:5000',
            'question' => 'nullable|string|max:2000',
            'specialty_requested' => 'nullable|string|max:255',
            'urgency_level' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'specialist_id' => 'nullable|exists:users,id',
            'patient_id' => 'nullable|exists:patients,id',
            'patient_age' => 'nullable|string|max:10',
            'patient_gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Le titre de la demande de téléexpertise est obligatoire.',
            'clinical_summary.required' => 'Le résumé clinique est obligatoire.',
        ];
    }

    public function normalizedPayload(): array
    {
        $validated = $this->validated();

        return [
            'titre' => $validated['title'],
            'description' => $validated['clinical_summary'],
            'resume_clinique' => $validated['clinical_summary'],
            'question' => $validated['question'] ?? null,
            'specialite_demandee' => $validated['specialty_requested'] ?? null,
            'priorite' => match ($validated['urgency_level'] ?? 'normal') {
                'low', 'normal' => 'normale',
                'high' => 'haute',
                'urgent' => 'urgente',
            },
            'age_patient' => $validated['patient_age'] ?? null,
            'genre_patient' => $validated['patient_gender'] ?? null,
            'expert_id' => $validated['specialist_id'] ?? null,
            'patient_id' => $validated['patient_id'] ?? null,
        ];
    }
}
