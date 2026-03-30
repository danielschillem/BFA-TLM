<?php

namespace Database\Factories;

use App\Models\CertificatDeces;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CertificatDecesFactory extends Factory
{
    protected $model = CertificatDeces::class;

    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'date_deces' => fake()->dateTimeBetween('-1 year', 'now'),
            'lieu_deces' => fake()->city(),
            'type_lieu_deces' => fake()->randomElement(['hopital', 'domicile', 'voie_publique']),
            'sexe_defunt' => fake()->randomElement(['M', 'F']),
            'age_defunt' => fake()->numberBetween(1, 95),
            'unite_age' => 'annees',
            'cause_directe' => 'Arrêt cardio-respiratoire',
            'cause_directe_code_icd11' => 'MH11',
            'maniere_deces' => 'naturelle',
            'statut' => 'brouillon',
            'medecin_certificateur_id' => User::factory(),
        ];
    }

    public function certifie(): static
    {
        return $this->state(fn () => [
            'statut' => 'certifie',
            'date_certification' => now(),
        ]);
    }

    public function valide(): static
    {
        return $this->state(fn () => [
            'statut' => 'valide',
            'date_certification' => now()->subDay(),
            'date_validation' => now(),
        ]);
    }
}
