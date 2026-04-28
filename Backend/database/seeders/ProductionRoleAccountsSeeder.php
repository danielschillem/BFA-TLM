<?php

namespace Database\Seeders;

use App\Models\Grade;
use App\Models\Localite;
use App\Models\Pays;
use App\Models\Service;
use App\Models\Structure;
use App\Models\TypeProfessionnelSante;
use App\Models\TypeStructure;
use App\Models\User;
use Illuminate\Database\Seeder;
use InvalidArgumentException;
use RuntimeException;

/**
 * Comptes de production : un utilisateur par rôle métier (hors admin déjà créé par ProductionSeeder).
 *
 * Prérequis : RolePermissionSeeder, ReferentielSeeder, au moins un administrateur.
 *
 * Variables :
 *   INITIAL_ROLE_ACCOUNTS_PASSWORD — mot de passe commun (≥12 caractères en prod)
 *
 * Usage :
 *   php artisan db:seed --class=ProductionRoleAccountsSeeder --force
 *
 * Appelé automatiquement depuis ProductionSeeder si SEED_ROLE_ACCOUNTS=true.
 */
class ProductionRoleAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('INITIAL_ROLE_ACCOUNTS_PASSWORD');
        if (!is_string($password) || $password === '') {
            $this->command?->warn('INITIAL_ROLE_ACCOUNTS_PASSWORD est vide — aucun compte par rôle créé.');

            return;
        }

        if (app()->isProduction() && strlen($password) < 12) {
            throw new InvalidArgumentException(
                'INITIAL_ROLE_ACCOUNTS_PASSWORD doit contenir au moins 12 caractères en production.'
            );
        }

        $admin = User::role('admin')->first();
        if (!$admin) {
            throw new RuntimeException(
                'Aucun administrateur en base. Exécutez d’abord ProductionSeeder (compte admin).'
            );
        }

        $bf = Pays::where('code', 'BF')->first();
        $ouaga = $bf ? Localite::where('commune', 'Ouagadougou')->where('pays_id', $bf->id)->first() : null;
        if (!$bf || !$ouaga) {
            throw new RuntimeException('Référentiel incomplet : pays BF ou localité Ouagadougou introuvable.');
        }

        $typeCHU = TypeStructure::where('libelle', 'CHU')->first();
        if (!$typeCHU) {
            throw new RuntimeException('Type de structure CHU introuvable (ReferentielSeeder).');
        }

        $gradeMed = Grade::where('code', 'MG')->first();
        $gradeSpec = Grade::where('code', 'MS')->first();
        $tpsMedecin = TypeProfessionnelSante::where('libelle', 'Médecin')->first();
        $tpsInfirmier = TypeProfessionnelSante::where('libelle', 'Infirmier')->first();

        $structure = Structure::firstOrCreate(
            ['libelle' => 'BFA TLM — Structure pilote'],
            [
                'telephone' => '+22625300000',
                'email' => 'contact-pilote@bfa-tlm.bf',
                'actif' => true,
                'type_structure_id' => $typeCHU->id,
                'created_by_id' => $admin->id,
                'localite_id' => $ouaga->id,
            ]
        );

        $serviceGeneral = Service::firstOrCreate(
            ['code' => 'TLM-MED-GEN', 'structure_id' => $structure->id],
            ['libelle' => 'Médecine générale', 'actif' => true]
        );

        $serviceCardio = Service::firstOrCreate(
            ['code' => 'TLM-CARDIO', 'structure_id' => $structure->id],
            ['libelle' => 'Cardiologie', 'actif' => true]
        );

        if (!$admin->structure_id) {
            $admin->update(['structure_id' => $structure->id]);
        }

        $accounts = [
            [
                'email' => 'gestionnaire@bfa-tlm.bf',
                'role' => 'structure_manager',
                'attrs' => [
                    'nom' => 'ZONGO',
                    'prenoms' => 'Rasmata',
                    'telephone_1' => '+22670000010',
                    'sexe' => 'F',
                    'structure_id' => $structure->id,
                    'created_by_id' => $admin->id,
                    'pays_id' => $bf->id,
                    'localite_id' => $ouaga->id,
                ],
            ],
            [
                'email' => 'dr.general@bfa-tlm.bf',
                'role' => 'doctor',
                'attrs' => [
                    'nom' => 'SAWADOGO',
                    'prenoms' => 'Dr. Ibrahim',
                    'telephone_1' => '+22670000011',
                    'sexe' => 'M',
                    'specialite' => 'Médecine générale',
                    'matricule' => 'TLM-MED-001',
                    'numero_ordre' => 'BF-MED-TLM-001',
                    'structure_id' => $structure->id,
                    'service_id' => $serviceGeneral->id,
                    'created_by_id' => $admin->id,
                    'grade_id' => $gradeMed?->id,
                    'type_professionnel_sante_id' => $tpsMedecin?->id,
                    'pays_id' => $bf->id,
                    'localite_id' => $ouaga->id,
                ],
            ],
            [
                'email' => 'dr.specialiste@bfa-tlm.bf',
                'role' => 'specialist',
                'attrs' => [
                    'nom' => 'COMPAORE',
                    'prenoms' => 'Dr. Fatimata',
                    'telephone_1' => '+22670000012',
                    'sexe' => 'F',
                    'specialite' => 'Cardiologie',
                    'matricule' => 'TLM-MED-002',
                    'numero_ordre' => 'BF-MED-TLM-002',
                    'structure_id' => $structure->id,
                    'service_id' => $serviceCardio->id,
                    'created_by_id' => $admin->id,
                    'grade_id' => $gradeSpec?->id,
                    'type_professionnel_sante_id' => $tpsMedecin?->id,
                    'pays_id' => $bf->id,
                    'localite_id' => $ouaga->id,
                ],
            ],
            [
                'email' => 'infirmier@bfa-tlm.bf',
                'role' => 'health_professional',
                'attrs' => [
                    'nom' => 'DIALLO',
                    'prenoms' => 'Mariam',
                    'telephone_1' => '+22670000013',
                    'sexe' => 'F',
                    'specialite' => 'Soins infirmiers',
                    'matricule' => 'TLM-INF-001',
                    'structure_id' => $structure->id,
                    'service_id' => $serviceGeneral->id,
                    'created_by_id' => $admin->id,
                    'grade_id' => $gradeMed?->id,
                    'type_professionnel_sante_id' => $tpsInfirmier?->id,
                    'pays_id' => $bf->id,
                    'localite_id' => $ouaga->id,
                ],
            ],
            [
                'email' => 'patient.demo@bfa-tlm.bf',
                'role' => 'patient',
                'attrs' => [
                    'nom' => 'KABORE',
                    'prenoms' => 'Aminata',
                    'telephone_1' => '+22670000014',
                    'sexe' => 'F',
                    'pays_id' => $bf->id,
                    'localite_id' => $ouaga->id,
                ],
            ],
        ];

        $rows = [];
        foreach ($accounts as $spec) {
            $this->ensureRoleUser(
                $spec['email'],
                $spec['role'],
                $spec['attrs'],
                $password
            );
            $rows[] = [$spec['email'], $spec['role']];
        }

        $this->command?->info('Comptes par rôle (mot de passe = INITIAL_ROLE_ACCOUNTS_PASSWORD) :');
        $this->command?->table(['Email', 'Rôle'], $rows);
        $this->command?->warn('Changez ces mots de passe après la première connexion.');
    }

    private function ensureRoleUser(string $email, string $roleName, array $attributes, string $password): void
    {
        $user = User::where('email', $email)->first();

        if ($user) {
            if (!$user->hasRole($roleName)) {
                $user->assignRole($roleName);
            }
            $this->command?->line("  Déjà présent : {$email} (rôle vérifié) — mot de passe non modifié.");

            return;
        }

        $user = User::create(array_merge($attributes, [
            'email' => $email,
            'password' => $password,
            'status' => 'actif',
        ]));

        $user->assignRole($roleName);
        $this->command?->line("  Créé : {$email} → {$roleName}");
    }
}
