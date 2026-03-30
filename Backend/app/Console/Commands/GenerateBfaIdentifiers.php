<?php

namespace App\Console\Commands;

use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\Structure;
use App\Models\User;
use App\Services\IdentifierService;
use Illuminate\Console\Command;

class GenerateBfaIdentifiers extends Command
{
    protected $signature = 'bfa:generate-identifiers {--force : Régénérer tous les identifiants, y compris ceux déjà existants}';

    protected $description = 'Génère les identifiants BFA-LPK pour les enregistrements existants (patients, dossiers, structures, utilisateurs)';

    public function handle(): int
    {
        $force = $this->option('force');

        $this->info('Génération des identifiants BFA-LPK...');
        $this->newLine();

        $this->generatePatientIPP($force);
        $this->generateDossierIdentifiers($force);
        $this->generateStructureCodes($force);
        $this->generateUserIdentifiers($force);

        $this->newLine();
        $this->info('Terminé.');

        return self::SUCCESS;
    }

    private function generatePatientIPP(bool $force): void
    {
        $query = Patient::query();
        if (!$force) {
            $query->whereNull('ipp');
        }

        $count = 0;
        $query->each(function (Patient $patient) use (&$count) {
            $patient->ipp = IdentifierService::generateIPP([
                $patient->nom,
                $patient->date_naissance,
                $patient->sexe,
            ]);
            $patient->saveQuietly();
            $count++;
        });

        $this->components->twoColumnDetail('IPP Patients', "<fg=green>{$count} générés</>");
    }

    private function generateDossierIdentifiers(bool $force): void
    {
        $query = DossierPatient::query();
        if (!$force) {
            $query->where(function ($q) {
                $q->whereNull('identifiant')
                  ->orWhere('identifiant', 'NOT LIKE', 'BFA-LPK-%');
            });
        }

        $count = 0;
        $query->each(function (DossierPatient $dossier) use (&$count) {
            $dossier->identifiant = IdentifierService::generateDossier([
                $dossier->patient_id,
            ]);
            $dossier->saveQuietly();
            $count++;
        });

        $this->components->twoColumnDetail('Dossiers Patients', "<fg=green>{$count} générés</>");
    }

    private function generateStructureCodes(bool $force): void
    {
        $query = Structure::query();
        if (!$force) {
            $query->whereNull('code_structure');
        }

        $count = 0;
        $query->each(function (Structure $structure) use (&$count) {
            $structure->code_structure = IdentifierService::generateStructure([
                $structure->libelle,
            ]);
            $structure->saveQuietly();
            $count++;
        });

        $this->components->twoColumnDetail('Structures', "<fg=green>{$count} générés</>");
    }

    private function generateUserIdentifiers(bool $force): void
    {
        $query = User::query();
        if (!$force) {
            $query->whereNull('identifiant_national');
        }

        $count = 0;
        $query->each(function (User $user) use (&$count) {
            $type = $user->specialite
                ? IdentifierService::TYPE_PS
                : IdentifierService::TYPE_USER;
            $user->identifiant_national = IdentifierService::generate(
                $type,
                [$user->nom, $user->prenoms, $user->email],
                'users',
                'identifiant_national'
            );
            $user->saveQuietly();
            $count++;
        });

        $this->components->twoColumnDetail('Utilisateurs', "<fg=green>{$count} générés</>");
    }
}
