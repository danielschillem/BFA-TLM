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
            LicenseModuleSeeder::class,
        ]);

        // Créer le Personal Access Client Passport s'il n'existe pas
        // Évite whereJsonContains qui peut échouer sur PostgreSQL
        if (Client::where('name', 'TLM Personal Access Client')->doesntExist()) {
            $client = Client::create([
                'name' => 'TLM Personal Access Client',
                'secret' => null,
                'redirect_uris' => [],
                'grant_types' => ['personal_access'],
                'revoked' => false,
                'provider' => 'users',
            ]);
            $this->command?->info("Passport Personal Access Client créé (ID: {$client->id})");
        }
    }
}
