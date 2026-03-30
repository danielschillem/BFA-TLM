<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Prescription;
use Illuminate\Database\Eloquent\Factories\Factory;

class PrescriptionFactory extends Factory
{
    protected $model = Prescription::class;

    public function definition(): array
    {
        return [
            'denomination' => fake()->randomElement(['Amoxicilline', 'Paracétamol', 'Ibuprofène', 'Métronidazole', 'Oméprazole']),
            'posologie' => fake()->randomElement(['500mg 3x/jour', '1g 2x/jour', '250mg matin et soir']),
            'instructions' => fake()->sentence(),
            'duree_jours' => fake()->numberBetween(3, 30),
            'statut' => 'active',
            'urgent' => false,
            'signee' => false,
            'consultation_id' => Consultation::factory(),
            'dossier_patient_id' => DossierPatient::factory(),
        ];
    }

    public function signed(): static
    {
        return $this->state(fn () => ['signee' => true]);
    }

    public function urgent(): static
    {
        return $this->state(fn () => ['urgent' => true]);
    }
}
