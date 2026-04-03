<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disponibilites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            // Recurring: jour_semaine 0 (dim) → 6 (sam), date_specifique null
            // Specific: date_specifique set, jour_semaine null
            $table->unsignedTinyInteger('jour_semaine')->nullable();
            $table->date('date_specifique')->nullable();
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->enum('type_consultation', ['teleconsultation', 'presentiel', 'both'])->default('both');
            $table->unsignedInteger('duree_creneau')->default(30); // minutes
            $table->decimal('tarif', 10, 2)->default(0); // FCFA
            $table->boolean('actif')->default(true);
            $table->foreignId('structure_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();

            $table->index(['user_id', 'actif']);
            $table->index(['jour_semaine', 'actif']);
            $table->index(['date_specifique', 'actif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disponibilites');
    }
};
