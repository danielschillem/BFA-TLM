<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('constantes', function (Blueprint $table) {
            $table->id();
            $table->decimal('poids', 5, 2)->nullable();
            $table->decimal('taille', 5, 2)->nullable();
            $table->decimal('imc', 5, 2)->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->integer('tension_systolique')->nullable();
            $table->integer('tension_diastolique')->nullable();
            $table->integer('frequence_cardiaque')->nullable();
            $table->integer('frequence_respiratoire')->nullable();
            $table->decimal('saturation_o2', 5, 2)->nullable();
            $table->decimal('glycemie', 6, 2)->nullable();
            $table->text('libelle')->nullable(); // chiffré
            $table->text('contexte')->nullable(); // chiffré
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('constantes');
    }
};
