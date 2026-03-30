<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->text('motif')->nullable(); // chiffré
            $table->dateTime('date');
            $table->text('observation')->nullable(); // chiffré
            $table->enum('statut', ['en_cours', 'terminee', 'annulee'])->default('en_cours');
            $table->enum('type_suivi', ['initial', 'suivi', 'urgence', 'controle'])->default('initial');
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('rendez_vous_id')->nullable()->constrained('rendez_vous')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // PS
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
