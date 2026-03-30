<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificat_deces', function (Blueprint $table) {
            $table->id();
            $table->string('numero_certificat', 30)->unique();

            // ── Patient décédé ──────────────────────────────────────
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('dossier_patient_id')->nullable()->constrained('dossier_patients')->nullOnDelete();

            // ── Circonstances du décès ──────────────────────────────
            $table->dateTime('date_deces');
            $table->time('heure_deces')->nullable();
            $table->string('lieu_deces')->nullable();
            $table->enum('type_lieu_deces', [
                'hopital', 'domicile', 'voie_publique', 'autre_etablissement', 'autre',
            ])->default('hopital');
            $table->enum('sexe_defunt', ['M', 'F'])->nullable();
            $table->unsignedSmallInteger('age_defunt')->nullable();
            $table->enum('unite_age', ['annees', 'mois', 'jours', 'heures'])->default('annees');

            // ── Causes de décès (modèle OMS — chaîne causale) ───────
            // Partie I : Séquence causale directe
            $table->string('cause_directe')->comment('Ligne a : maladie ou affection morbide ayant directement provoqué le décès');
            $table->string('cause_directe_code_icd11', 30)->nullable();
            $table->string('cause_directe_uri_icd11')->nullable();
            $table->string('cause_directe_delai')->nullable()->comment('Intervalle entre début et décès');

            $table->string('cause_antecedente_1')->nullable()->comment('Ligne b : due à ou conséquence de');
            $table->string('cause_antecedente_1_code_icd11', 30)->nullable();
            $table->string('cause_antecedente_1_uri_icd11')->nullable();
            $table->string('cause_antecedente_1_delai')->nullable();

            $table->string('cause_antecedente_2')->nullable()->comment('Ligne c : due à ou conséquence de');
            $table->string('cause_antecedente_2_code_icd11', 30)->nullable();
            $table->string('cause_antecedente_2_uri_icd11')->nullable();
            $table->string('cause_antecedente_2_delai')->nullable();

            $table->string('cause_initiale')->nullable()->comment('Ligne d : cause initiale (fondamentale)');
            $table->string('cause_initiale_code_icd11', 30)->nullable();
            $table->string('cause_initiale_uri_icd11')->nullable();
            $table->string('cause_initiale_delai')->nullable();

            // Partie II : Autres états morbides ayant contribué au décès
            $table->text('autres_etats_morbides')->nullable()->comment('Affections ayant contribué au décès mais non liées à la chaîne causale');
            $table->string('autres_etats_morbides_codes_icd11')->nullable()->comment('Codes ICD-11 séparés par des virgules');

            // ── Circonstances particulières ──────────────────────────
            $table->enum('maniere_deces', [
                'naturelle', 'accident', 'suicide', 'homicide', 'indeterminee', 'en_attente_enquete',
            ])->default('naturelle');
            $table->boolean('autopsie_pratiquee')->default(false);
            $table->boolean('resultats_autopsie_disponibles')->default(false);
            $table->text('resultats_autopsie')->nullable();

            // ── Grossesse (femmes 10-50 ans) ────────────────────────
            $table->boolean('grossesse_contribue')->default(false);
            $table->enum('statut_grossesse', [
                'non_applicable', 'non_enceinte', 'enceinte', 'moins_42_jours_postpartum',
                '43_jours_a_1_an_postpartum',
            ])->default('non_applicable');

            // ── Chirurgie récente ───────────────────────────────────
            $table->boolean('chirurgie_recente')->default(false);
            $table->date('date_chirurgie')->nullable();
            $table->string('raison_chirurgie')->nullable();

            // ── Certification ───────────────────────────────────────
            $table->enum('statut', [
                'brouillon', 'certifie', 'valide', 'rejete', 'annule',
            ])->default('brouillon');
            $table->foreignId('medecin_certificateur_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('date_certification')->nullable();
            $table->foreignId('validateur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('date_validation')->nullable();
            $table->text('motif_rejet')->nullable();
            $table->text('observations')->nullable();

            // ── Structure et traçabilité ────────────────────────────
            $table->foreignId('structure_id')->nullable()->constrained('structures')->nullOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Index pour recherche et statistiques
            $table->index(['date_deces']);
            $table->index(['statut']);
            $table->index(['cause_directe_code_icd11']);
            $table->index(['maniere_deces']);
            $table->index(['structure_id', 'date_deces']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificat_deces');
    }
};
