<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Types de facturation
        Schema::create('type_facturations', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Paiements
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            $table->text('telephone')->nullable(); // chiffré
            $table->text('montant'); // chiffré
            $table->text('code_otp')->nullable(); // chiffré
            $table->enum('statut', ['en_attente', 'confirme', 'echoue', 'rembourse'])->default('en_attente');
            $table->string('reference')->nullable()->unique();
            $table->enum('methode', ['orange_money', 'moov_money', 'carte', 'especes'])->default('orange_money');
            $table->foreignId('rendez_vous_id')->constrained('rendez_vous')->cascadeOnDelete();
            $table->foreignId('type_facturation_id')->nullable()->constrained('type_facturations')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements');
        Schema::dropIfExists('type_facturations');
    }
};
