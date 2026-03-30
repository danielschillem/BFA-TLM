<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Laravel\Passport\Client;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            TestDataSeeder::class,
        ]);

        // Créer le Personal Access Client Passport s'il n'existe pas
        if (Client::where('provider', 'users')->whereJsonContains('grant_types', 'personal_access')->doesntExist()) {
            $client = Client::create([
                'name' => 'TLM Personal Access Client',
                'secret' => null,
                'redirect_uris' => [],
                'grant_types' => ['personal_access'],
                'revoked' => false,
                'provider' => 'users',
            ]);
            $this->command->info("Passport Personal Access Client créé (ID: {$client->id})");
        }
    }
}
