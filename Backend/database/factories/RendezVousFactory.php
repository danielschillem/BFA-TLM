<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RendezVousFactory extends Factory
{
    protected $model = RendezVous::class;

    public function definition(): array
    {
        return [
            'type' => fake()->randomElement(['teleconsultation', 'presentiel', 'suivi', 'urgence']),
            'motif' => fake()->sentence(),
            'date' => fake()->dateTimeBetween('now', '+30 days'),
            'heure' => fake()->randomElement(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00']),
            'priorite' => 'normale',
            'statut' => 'planifie',
            'patient_id' => Patient::factory(),
            'user_id' => User::factory()->doctor(),
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn () => ['statut' => 'confirme']);
    }

    public function teleconsultation(): static
    {
        return $this->state(fn () => ['type' => 'teleconsultation']);
    }
}
