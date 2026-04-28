<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ResetAdminPasswordCommand extends Command
{
    protected $signature = 'bfa:reset-admin-password
                            {email=admin@bfa-tlm.bf : Adresse email du compte}
                            {--password= : Mot de passe (sinon saisie masquée)}';

    protected $description = 'Réinitialise le mot de passe d\'un utilisateur (récupération d\'accès)';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("Aucun utilisateur avec l'email : {$email}");

            return self::FAILURE;
        }

        $password = (string) $this->option('password');
        if ($password === '') {
            $password = (string) $this->secret('Nouveau mot de passe');
            $confirm = (string) $this->secret('Confirmer le mot de passe');
            if ($password !== $confirm) {
                $this->error('Les mots de passe ne correspondent pas.');

                return self::FAILURE;
            }
        }

        $min = app()->isProduction() ? 12 : 8;
        if (strlen($password) < $min) {
            $this->error("Le mot de passe doit faire au moins {$min} caractères.");

            return self::FAILURE;
        }

        $user->password = $password;
        $user->save();

        $this->info("Mot de passe mis à jour pour {$email}.");

        return self::SUCCESS;
    }
}
