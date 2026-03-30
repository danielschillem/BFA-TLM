<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    protected $model = Patient::class;

    public function definition(): array
    {
        return [
            'nom' => fake()->lastName(),
            'prenoms' => fake()->firstName(),
            'date_naissance' => fake()->dateTimeBetween('-80 years', '-1 year'),
            'sexe' => fake()->randomElement(['M', 'F']),
            'telephone_1' => fake()->numerify('+226 ## ## ## ##'),
            'email' => fake()->unique()->safeEmail(),
        ];
    }

    public function withUser(): static
    {
        return $this->state(fn () => [
            'user_id' => User::factory(),
        ]);
    }
}
