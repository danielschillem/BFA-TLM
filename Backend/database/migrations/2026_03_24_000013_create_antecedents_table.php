<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('antecedents', function (Blueprint $table) {
            $table->id();
            $table->text('intitule'); // chiffré
            $table->text('description')->nullable(); // chiffré
            $table->enum('type', ['medical', 'chirurgical', 'familial', 'allergie', 'autre']);
            $table->date('date_diagnostic')->nullable();
            $table->text('traitements')->nullable(); // chiffré
            $table->text('etat_actuel')->nullable(); // chiffré
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // PS qui a saisi
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('antecedents');
    }
};
