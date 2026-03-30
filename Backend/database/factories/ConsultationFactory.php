<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConsultationFactory extends Factory
{
    protected $model = Consultation::class;

    public function definition(): array
    {
        return [
            'motif_principal' => fake()->sentence(),
            'date' => now(),
            'statut' => 'en_cours',
            'type_suivi' => fake()->randomElement(['initial', 'suivi', 'urgence', 'controle']),
            'dossier_patient_id' => DossierPatient::factory(),
            'user_id' => User::factory()->doctor(),
        ];
    }

    public function terminated(): static
    {
        return $this->state(fn () => [
            'statut' => 'terminee',
        ]);
    }
}
