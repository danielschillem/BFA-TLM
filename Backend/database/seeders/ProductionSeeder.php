<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Laravel\Passport\Client;

/**
 * Seeder de production — crée uniquement :
 *   1. Les rôles et permissions
 *   2. Un compte administrateur initial
 *   3. Le client Passport Personal Access
 *
 * Usage : php artisan db:seed --class=ProductionSeeder
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Rôles & Permissions (idempotent)
        $this->call(RolePermissionSeeder::class);

        // 2. Administrateur initial (si aucun admin n'existe)
        if (User::role('admin')->doesntExist()) {
            $password = bin2hex(random_bytes(8)); // 16 chars aléatoires

            $admin = User::create([
                'nom'         => 'Administrateur',
                'prenoms'     => 'LiptakoCare',
                'email'       => 'admin@liptakocare.bf',
                'password'    => $password,
                'telephone_1' => '',
                'sexe'        => 'M',
                'status'      => 'actif',
            ]);
            $admin->assignRole('admin');

            $this->command->warn('╔══════════════════════════════════════════════╗');
            $this->command->warn('║  COMPTE ADMINISTRATEUR INITIAL CRÉÉ         ║');
            $this->command->warn('╠══════════════════════════════════════════════╣');
            $this->command->info("  Email    : admin@liptakocare.bf");
            $this->command->info("  Mot de passe : {$password}");
            $this->command->warn('╠══════════════════════════════════════════════╣');
            $this->command->warn('║  CHANGEZ CE MOT DE PASSE IMMÉDIATEMENT !    ║');
            $this->command->warn('╚══════════════════════════════════════════════╝');
        } else {
            $this->command->info('Un administrateur existe déjà — aucun compte créé.');
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
