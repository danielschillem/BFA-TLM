<?php

namespace Database\Factories;

use App\Models\Structure;
use Illuminate\Database\Eloquent\Factories\Factory;

class StructureFactory extends Factory
{
    protected $model = Structure::class;

    public function definition(): array
    {
        return [
            'libelle' => fake()->company() . ' - ' . fake()->randomElement(['CHU', 'CMA', 'CSPS']),
            'telephone' => fake()->numerify('+226 ## ## ## ##'),
            'email' => fake()->unique()->companyEmail(),
            'actif' => true,
        ];
    }
}
