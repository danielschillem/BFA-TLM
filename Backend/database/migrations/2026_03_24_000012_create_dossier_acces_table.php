<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dossier_acces', function (Blueprint $table) {
            $table->id();
            $table->enum('niveau_acces', ['lecture', 'ecriture', 'complet'])->default('lecture');
            $table->timestamp('date_debut_acces');
            $table->timestamp('date_fin_acces')->nullable();
            $table->string('motif_acces')->nullable();
            $table->boolean('acces_actif')->default(true);
            $table->string('motif_revocation')->nullable();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // qui a accès
            $table->foreignId('autorise_par')->nullable()->constrained('users')->nullOnDelete(); // qui a autorisé
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dossier_acces');
    }
};
