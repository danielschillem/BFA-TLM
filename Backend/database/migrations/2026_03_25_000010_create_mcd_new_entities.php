<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ══════════════════════════════════════════════════════════════
        //  1. NOUVELLES TABLES DE RÉFÉRENCE
        // ══════════════════════════════════════════════════════════════

        Schema::create('type_diagnostics', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('type_examens', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ══════════════════════════════════════════════════════════════
        //  2. NOUVELLES ENTITÉS MÉDICALES
        // ══════════════════════════════════════════════════════════════

        // Allergies (séparées des antécédents)
        Schema::create('allergies', function (Blueprint $table) {
            $table->id();
            $table->text('allergenes');
            $table->text('manifestations')->nullable();
            $table->enum('severite', ['legere', 'moderee', 'severe', 'critique'])->default('legere');
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->timestamps();
        });

        // Habitudes de vie
        Schema::create('habitude_de_vies', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // tabac, alcool, drogue, sport, alimentation...
            $table->string('statut')->nullable(); // actif, ancien, jamais
            $table->text('details')->nullable();
            $table->date('date_debut')->nullable();
            $table->date('date_fin')->nullable();
            $table->string('intensite')->nullable();
            $table->string('frequence')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->timestamps();
        });

        // Antécédents médicamenteux
        Schema::create('antecedent_medicamenteux', function (Blueprint $table) {
            $table->id();
            $table->string('nom_marque')->nullable();
            $table->string('nom_generique')->nullable();
            $table->date('date_debut')->nullable();
            $table->date('date_fin')->nullable();
            $table->string('dose')->nullable();
            $table->string('unite')->nullable();
            $table->integer('duree')->nullable();
            $table->string('voie_administration')->nullable();
            $table->text('tolerance')->nullable();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->timestamps();
        });

        // Examen clinique (1:1 avec Consultation)
        Schema::create('examen_cliniques', function (Blueprint $table) {
            $table->id();
            $table->text('synthese_globale')->nullable();
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Examen clinique par système
        Schema::create('examen_clinique_systemes', function (Blueprint $table) {
            $table->id();
            $table->string('systeme'); // cardiovasculaire, respiratoire, etc.
            $table->text('description')->nullable();
            $table->text('impression')->nullable();
            $table->foreignId('examen_clinique_id')->constrained('examen_cliniques')->cascadeOnDelete();
            $table->timestamps();
        });

        // Session de mesure vitale (remplace constantes)
        Schema::create('session_mesure_vitales', function (Blueprint $table) {
            $table->id();
            $table->dateTime('date_mesure');
            $table->enum('contexte', ['consultation', 'triage', 'urgence', 'hospitalisation'])->default('consultation');
            $table->text('notes')->nullable();
            $table->foreignId('dossier_patient_id')->constrained('dossier_patients')->cascadeOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Mesures vitales individuelles
        Schema::create('mesure_vitales', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // temperature, tension_arterielle, FC, FR, SpO2, glycemie...
            $table->string('valeur');
            $table->string('valeur_2')->nullable(); // ex: diastolique pour TA
            $table->string('unite')->nullable();
            $table->json('meta_json')->nullable();
            $table->foreignId('session_mesure_vitale_id')->constrained('session_mesure_vitales')->cascadeOnDelete();
            $table->timestamps();
        });

        // Anthropométrie
        Schema::create('anthropometries', function (Blueprint $table) {
            $table->id();
            $table->decimal('taille', 5, 2)->nullable(); // cm
            $table->decimal('poids', 5, 2)->nullable(); // kg
            $table->decimal('imc', 5, 2)->nullable();
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->timestamps();
        });

        // Prescription médicamenteuse (enfant de prescriptions)
        Schema::create('prescription_medicamenteux', function (Blueprint $table) {
            $table->id();
            $table->string('nom_marque')->nullable();
            $table->string('nom_generique')->nullable();
            $table->string('dose')->nullable();
            $table->string('unite')->nullable();
            $table->integer('duree')->nullable();
            $table->string('voie_administration')->nullable();
            $table->text('instructions')->nullable();
            $table->enum('statut', ['active', 'terminee', 'arretee'])->default('active');
            $table->text('consequences_statut')->nullable();
            $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
            $table->timestamps();
        });

        // Prescription non médicamenteuse (enfant de prescriptions)
        Schema::create('prescription_non_medicamenteux', function (Blueprint $table) {
            $table->id();
            $table->text('description');
            $table->text('resultat')->nullable();
            $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
            $table->timestamps();
        });

        // ══════════════════════════════════════════════════════════════
        //  3. TABLES PIVOT NOUVELLES
        // ══════════════════════════════════════════════════════════════

        // User ↔ Service (many-to-many selon MCD)
        Schema::create('service_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'service_id']);
        });

        // Invités d'un rendez-vous (User ↔ RendezVous many-to-many)
        Schema::create('rendez_vous_invite', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rendez_vous_id')->constrained('rendez_vous')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['rendez_vous_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rendez_vous_invite');
        Schema::dropIfExists('service_user');
        Schema::dropIfExists('prescription_non_medicamenteux');
        Schema::dropIfExists('prescription_medicamenteux');
        Schema::dropIfExists('anthropometries');
        Schema::dropIfExists('mesure_vitales');
        Schema::dropIfExists('session_mesure_vitales');
        Schema::dropIfExists('examen_clinique_systemes');
        Schema::dropIfExists('examen_cliniques');
        Schema::dropIfExists('antecedent_medicamenteux');
        Schema::dropIfExists('habitude_de_vies');
        Schema::dropIfExists('allergies');
        Schema::dropIfExists('type_examens');
        Schema::dropIfExists('type_diagnostics');
    }
};
