<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Types d'actes médicaux
        Schema::create('type_actes', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Actes médicaux
        Schema::create('actes', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->decimal('cout', 10, 2)->default(0);
            $table->text('description')->nullable();
            $table->integer('duree')->nullable(); // en minutes
            $table->foreignId('type_acte_id')->nullable()->constrained('type_actes')->nullOnDelete();
            $table->timestamps();
        });

        // Rendez-vous
        Schema::create('rendez_vous', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['teleconsultation', 'presentiel', 'suivi', 'urgence']);
            $table->text('motif')->nullable(); // chiffré
            $table->date('date');
            $table->time('heure');
            $table->enum('priorite', ['normale', 'haute', 'urgente'])->default('normale');
            $table->enum('statut', ['planifie', 'confirme', 'en_cours', 'termine', 'annule'])->default('planifie');
            $table->string('room_name')->nullable(); // salle virtuelle
            $table->text('resume')->nullable(); // chiffré
            $table->text('motif_annulation')->nullable(); // chiffré
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // PS
            $table->foreignId('structure_id')->nullable()->constrained('structures')->nullOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->foreignId('salle_id')->nullable()->constrained('salles')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Pivot rendez-vous <-> acte
        Schema::create('acte_rendez_vous', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rendez_vous_id')->constrained('rendez_vous')->cascadeOnDelete();
            $table->foreignId('acte_id')->constrained('actes')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acte_rendez_vous');
        Schema::dropIfExists('rendez_vous');
        Schema::dropIfExists('actes');
        Schema::dropIfExists('type_actes');
    }
};
