<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nom' => fake()->lastName(),
            'prenoms' => fake()->firstName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'telephone_1' => fake()->numerify('+226 ## ## ## ##'),
            'sexe' => fake()->randomElement(['M', 'F']),
            'status' => 'actif',
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function doctor(): static
    {
        return $this->state(fn () => [
            'specialite' => fake()->randomElement(['Médecine Générale', 'Cardiologie', 'Pédiatrie', 'Dermatologie']),
            'matricule' => 'MAT-' . fake()->unique()->numerify('######'),
        ]);
    }

    public function patient(): static
    {
        return $this->state(fn () => [
            'specialite' => null,
            'matricule' => null,
        ]);
    }
}
