<?php

namespace Database\Factories;

use App\Models\DicomStudy;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

class DicomStudyFactory extends Factory
{
    protected $model = DicomStudy::class;

    public function definition(): array
    {
        return [
            'study_instance_uid' => '1.2.826.' . fake()->unique()->numerify('####.####.####.####'),
            'accession_number' => fake()->optional(0.7)->numerify('ACC-######'),
            'study_id' => fake()->optional(0.5)->numerify('STD-####'),
            'study_description' => fake()->randomElement([
                'Radiographie thorax face',
                'Scanner cérébral',
                'IRM lombaire',
                'Échographie abdominale',
                'Radiographie du bassin',
            ]),
            'modality' => fake()->randomElement(['CR', 'CT', 'MR', 'US', 'DX', 'XA']),
            'body_part_examined' => fake()->randomElement(['CHEST', 'HEAD', 'ABDOMEN', 'SPINE', 'PELVIS', null]),
            'study_date' => fake()->dateTimeBetween('-1 year', 'now'),
            'patient_dicom_id' => fake()->numerify('PAT-####'),
            'patient_dicom_name' => fake()->lastName() . '^' . fake()->firstName(),
            'number_of_series' => fake()->numberBetween(1, 8),
            'number_of_instances' => fake()->numberBetween(10, 200),
            'statut' => fake()->randomElement(['recu', 'en_lecture', 'lu', 'valide']),
            'referring_physician' => fake()->optional(0.6)->name(),
            'interpretation' => fake()->optional(0.3)->paragraph(),
            'patient_id' => Patient::factory(),
        ];
    }
}
