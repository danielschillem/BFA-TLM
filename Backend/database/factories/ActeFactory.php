<?php

namespace Database\Factories;

use App\Models\Acte;
use Illuminate\Database\Eloquent\Factories\Factory;

class ActeFactory extends Factory
{
    protected $model = Acte::class;

    public function definition(): array
    {
        return [
            'libelle' => fake()->randomElement(['Consultation générale', 'ECG', 'Échographie', 'Radiographie', 'Bilan sanguin']),
            'cout' => fake()->randomElement([2000, 3000, 5000, 10000, 15000]),
            'description' => fake()->sentence(),
            'duree' => fake()->randomElement([15, 20, 30, 45, 60]),
        ];
    }
}
