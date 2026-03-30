<?php

namespace Database\Factories;

use App\Models\DossierPatient;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

class DossierPatientFactory extends Factory
{
    protected $model = DossierPatient::class;

    public function definition(): array
    {
        return [
            'statut' => 'ouvert',
            'date_ouverture' => now(),
            'nb_consultations' => 0,
            'nb_hospitalisations' => 0,
            'patient_id' => Patient::factory(),
        ];
    }
}
