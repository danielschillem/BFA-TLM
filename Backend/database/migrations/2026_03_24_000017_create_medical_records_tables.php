<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostics', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['principal', 'secondaire', 'differentiel']);
            $table->string('intitule');
            $table->string('code_cim')->nullable(); // Code CIM-10
            $table->enum('gravite', ['legere', 'moderee', 'severe', 'critique'])->default('legere');
            $table->enum('statut', ['presume', 'confirme', 'infirme'])->default('presume');
            $table->text('description')->nullable(); // chiffré
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('traitements', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['medicamenteux', 'chirurgical', 'physiotherapie', 'autre']);
            $table->text('medicaments')->nullable(); // chiffré
            $table->text('dosages')->nullable(); // chiffré
            $table->text('posologies')->nullable(); // chiffré
            $table->integer('duree')->nullable(); // jours
            $table->enum('statut', ['en_cours', 'termine', 'arrete'])->default('en_cours');
            $table->foreignId('diagnostic_id')->constrained('diagnostics')->cascadeOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->text('denomination'); // chiffré
            $table->text('posologie')->nullable(); // chiffré
            $table->text('instructions')->nullable(); // chiffré
            $table->integer('duree_jours')->nullable();
            $table->enum('statut', ['active', 'terminee', 'annulee'])->default('active');
            $table->boolean('urgent')->default(false);
            $table->boolean('signee')->default(false);
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('examens', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->text('intitule'); // chiffré
            $table->text('indication')->nullable(); // chiffré
            $table->text('resultats')->nullable(); // chiffré
            $table->text('commentaire')->nullable(); // chiffré
            $table->enum('statut', ['prescrit', 'en_cours', 'resultat_disponible', 'interprete'])->default('prescrit');
            $table->boolean('urgent')->default(false);
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examens');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('traitements');
        Schema::dropIfExists('diagnostics');
    }
};
