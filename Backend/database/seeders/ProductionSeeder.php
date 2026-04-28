<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use InvalidArgumentException;
use Laravel\Passport\Client;

/**
 * Seeder de production — crée uniquement :
 *   1. Les rôles et permissions
 *   2. Un compte administrateur initial
 *   3. Le client Passport Personal Access
 *
 * Usage : php artisan db:seed --class=ProductionSeeder
 *
 * Mot de passe admin : définir INITIAL_ADMIN_PASSWORD dans .env avant le premier seed
 * (recommandé en prod, min. 12 caractères). Sinon mot de passe aléatoire affiché une fois.
 *
 * Comptes par rôle (gestionnaire, médecin, etc.) : SEED_ROLE_ACCOUNTS=true et
 * INITIAL_ROLE_ACCOUNTS_PASSWORD (voir ProductionRoleAccountsSeeder).
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Rôles & Permissions (idempotent)
        $this->call(RolePermissionSeeder::class);

        // 1b. Référentiels (pays, localités, grades, types PS…)
        $this->call(ReferentielSeeder::class);

        // 2. Administrateur initial (si aucun admin n'existe)
        if (User::role('admin')->doesntExist()) {
            $adminEmail = (string) env('INITIAL_ADMIN_EMAIL', 'admin@bfa-tlm.bf');
            $configured = env('INITIAL_ADMIN_PASSWORD');
            $fromEnv = is_string($configured) && $configured !== '';

            if ($fromEnv) {
                $password = $configured;
                if (app()->isProduction() && strlen($password) < 12) {
                    throw new InvalidArgumentException(
                        'INITIAL_ADMIN_PASSWORD doit contenir au moins 12 caractères en production.'
                    );
                }
            } else {
                $password = bin2hex(random_bytes(8)); // 16 chars aléatoires
            }

            $admin = User::create([
                'nom'         => 'Administrateur',
                'prenoms'     => 'BFA TLM',
                'email'       => $adminEmail,
                'password'    => $password,
                'telephone_1' => '',
                'sexe'        => 'M',
                'status'      => 'actif',
            ]);
            $admin->assignRole('admin');

            if ($fromEnv) {
                $this->command->info("Compte administrateur créé ({$adminEmail}) — mot de passe défini via INITIAL_ADMIN_PASSWORD.");
                $this->command->warn('Pensez à retirer INITIAL_ADMIN_PASSWORD du .env après déploiement.');
            } else {
                $this->command->warn('╔══════════════════════════════════════════════╗');
                $this->command->warn('║  COMPTE ADMINISTRATEUR INITIAL CRÉÉ         ║');
                $this->command->warn('╠══════════════════════════════════════════════╣');
                $this->command->info("  Email    : {$adminEmail}");
                $this->command->info("  Mot de passe : {$password}");
                $this->command->warn('╠══════════════════════════════════════════════╣');
                $this->command->warn('║  CHANGEZ CE MOT DE PASSE IMMÉDIATEMENT !    ║');
                $this->command->warn('╚══════════════════════════════════════════════╝');
            }
        } else {
            $this->command->info('Un administrateur existe déjà — aucun compte créé.');
        }

        if (filter_var(env('SEED_ROLE_ACCOUNTS', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->call(ProductionRoleAccountsSeeder::class);
        }

        // 3. Passport Personal Access Client (idempotent)
        // Évite whereJsonContains qui peut échouer sur PostgreSQL
        if (Client::where('name', 'TLM Personal Access Client')->doesntExist()) {
            $client = Client::create([
                'name'          => 'TLM Personal Access Client',
                'secret'        => null,
                'redirect_uris' => [],
                'grant_types'   => ['personal_access'],
                'revoked'       => false,
                'provider'      => 'users',
            ]);
            $this->command?->info("Passport Personal Access Client créé (ID: {$client->id})");
        }
    }
}
