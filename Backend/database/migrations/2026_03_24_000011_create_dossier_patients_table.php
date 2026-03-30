<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dossier_patients', function (Blueprint $table) {
            $table->id();
            $table->string('identifiant')->unique();
            $table->enum('statut', ['ouvert', 'ferme', 'archive'])->default('ouvert');
            $table->text('groupe_sanguin')->nullable(); // chiffré
            $table->text('notes_importantes')->nullable(); // chiffré
            $table->unsignedInteger('nb_consultations')->default(0);
            $table->unsignedInteger('nb_hospitalisations')->default(0);
            $table->date('date_ouverture');
            $table->date('date_derniere_consultation')->nullable();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dossier_patients');
    }
};
