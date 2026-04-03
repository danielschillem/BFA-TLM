<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value');
            $table->string('type')->default('string'); // string, integer, decimal, boolean, json
            $table->string('group')->default('general');
            $table->string('label')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Insérer les paramètres par défaut
        DB::table('platform_settings')->insert([
            [
                'key' => 'platform_fee',
                'value' => '500',
                'type' => 'integer',
                'group' => 'payment',
                'label' => 'Frais de service plateforme (FCFA)',
                'description' => 'Montant fixe facturé au patient pour chaque prise de RDV avec paiement en ligne',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'mobile_money_rate',
                'value' => '1.5',
                'type' => 'decimal',
                'group' => 'payment',
                'label' => 'Taux frais mobile money (%)',
                'description' => 'Pourcentage appliqué sur le montant total pour couvrir les frais API Orange/Moov Money',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'platform_fee_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'group' => 'payment',
                'label' => 'Activer les frais de service',
                'description' => 'Si désactivé, aucun frais de service plateforme ne sera facturé',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'free_cancellation_hours',
                'value' => '24',
                'type' => 'integer',
                'group' => 'payment',
                'label' => 'Annulation gratuite (heures)',
                'description' => 'Nombre d\'heures avant le RDV où l\'annulation est gratuite avec remboursement intégral',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
