<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ══════════════════════════════════════════════════════════════
        //  1. PATIENT — Personne à prévenir + lieu de naissance
        // ══════════════════════════════════════════════════════════════
        Schema::table('patients', function (Blueprint $table) {
            $table->string('lieu_naissance')->nullable()->after('date_naissance');
            $table->string('nom_personne_prevenir')->nullable()->after('email');
            $table->string('prenom_personne_prevenir')->nullable()->after('nom_personne_prevenir');
            $table->string('filiation_personne_prevenir')->nullable()->after('prenom_personne_prevenir');
            $table->string('telephone_personne_prevenir')->nullable()->after('filiation_personne_prevenir');
        });

        // ══════════════════════════════════════════════════════════════
        //  2. USER — lieu/date naissance, last_activity
        // ══════════════════════════════════════════════════════════════
        Schema::table('users', function (Blueprint $table) {
            $table->string('lieu_naissance')->nullable()->after('sexe');
            $table->date('date_naissance')->nullable()->after('lieu_naissance');
            $table->timestamp('last_activity_at')->nullable()->after('last_login_at');
        });

        // ══════════════════════════════════════════════════════════════
        //  3. STRUCTURE — telephone_2, parent (self-ref), date_creation
        // ══════════════════════════════════════════════════════════════
        Schema::table('structures', function (Blueprint $table) {
            $table->string('telephone_2')->nullable()->after('telephone');
            $table->date('date_creation')->nullable()->after('email');
            $table->foreignId('parent_id')->nullable()->after('created_by_id')
                ->constrained('structures')->nullOnDelete();
        });

        // ══════════════════════════════════════════════════════════════
        //  4. CONSULTATION — Remodeler (motif_principal, histoire_maladie…)
        // ══════════════════════════════════════════════════════════════
        Schema::table('consultations', function (Blueprint $table) {
            $table->renameColumn('motif', 'motif_principal');
        });
        Schema::table('consultations', function (Blueprint $table) {
            $table->text('histoire_maladie_symptomes')->nullable()->after('motif_principal');
            $table->text('conclusion_medicale')->nullable()->after('histoire_maladie_symptomes');
            $table->text('conduite_a_tenir')->nullable()->after('conclusion_medicale');
        });

        // ══════════════════════════════════════════════════════════════
        //  5. PRESCRIPTION — Devenir entité parent (type, date_debut, date_fin, tolerance)
        // ══════════════════════════════════════════════════════════════
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->string('type')->nullable()->after('id'); // medicamenteux, non_medicamenteux, mixte
            $table->date('date_debut')->nullable()->after('duree_jours');
            $table->date('date_fin')->nullable()->after('date_debut');
            $table->text('tolerance')->nullable()->after('date_fin');
        });

        // ══════════════════════════════════════════════════════════════
        //  6. DIAGNOSTIC — Ajouter type_diagnostic_id (table de référence)
        // ══════════════════════════════════════════════════════════════
        Schema::table('diagnostics', function (Blueprint $table) {
            $table->foreignId('type_diagnostic_id')->nullable()->after('type')
                ->constrained('type_diagnostics')->nullOnDelete();
            // Renommer intitule → libelle pour conformité MCD
            $table->renameColumn('intitule', 'libelle');
        });

        // ══════════════════════════════════════════════════════════════
        //  7. EXAMEN → ExamenComplementaire (ajout type_examen_id + dates)
        // ══════════════════════════════════════════════════════════════
        Schema::table('examens', function (Blueprint $table) {
            $table->foreignId('type_examen_id')->nullable()->after('type')
                ->constrained('type_examens')->nullOnDelete();
            $table->renameColumn('intitule', 'libelle');
        });
        Schema::table('examens', function (Blueprint $table) {
            $table->date('date_demande')->nullable()->after('libelle');
            $table->date('date_examen')->nullable()->after('date_demande');
            $table->date('date_reception_resultat')->nullable()->after('date_examen');
        });

        // ══════════════════════════════════════════════════════════════
        //  8. ANTECEDENT — Conformité MCD (code_cim, resolution, filiation…)
        // ══════════════════════════════════════════════════════════════
        Schema::table('antecedents', function (Blueprint $table) {
            // Renommer intitule → libelle
            $table->renameColumn('intitule', 'libelle');
            $table->renameColumn('date_diagnostic', 'date_evenement');
        });
        Schema::table('antecedents', function (Blueprint $table) {
            $table->string('code_cim')->nullable()->after('libelle');
            $table->text('resolution')->nullable()->after('date_evenement');
            $table->string('filiation')->nullable()->after('resolution');
            $table->date('date_naissance_parent')->nullable()->after('filiation');
            $table->date('date_deces_parent')->nullable()->after('date_naissance_parent');
            $table->foreignId('consultation_id')->nullable()->after('user_id')
                ->constrained('consultations')->nullOnDelete();
        });

        // ══════════════════════════════════════════════════════════════
        //  9. RENDEZ-VOUS — type_resume, date_annulation, dossier_patient_id, type_facturation_id
        // ══════════════════════════════════════════════════════════════
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->string('type_resume')->nullable()->after('resume');
            $table->dateTime('date_annulation')->nullable()->after('motif_annulation');
            $table->foreignId('dossier_patient_id')->nullable()->after('patient_id')
                ->constrained('dossier_patients')->nullOnDelete();
            $table->foreignId('type_facturation_id')->nullable()->after('salle_id')
                ->constrained('type_facturations')->nullOnDelete();
        });

        // ══════════════════════════════════════════════════════════════
        //  10. DOSSIER_PATIENT — date_fermeture, structure_id
        // ══════════════════════════════════════════════════════════════
        Schema::table('dossier_patients', function (Blueprint $table) {
            $table->date('date_fermeture')->nullable()->after('date_derniere_consultation');
            $table->foreignId('structure_id')->nullable()->after('patient_id')
                ->constrained('structures')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->after('structure_id')
                ->constrained('users')->nullOnDelete();
        });

        // ══════════════════════════════════════════════════════════════
        //  11. DOCUMENT — Champs manquants MCD
        // ══════════════════════════════════════════════════════════════
        Schema::table('documents', function (Blueprint $table) {
            $table->string('type')->nullable()->after('titre');
            $table->string('nom_fichier_original')->nullable()->after('chemin_fichier');
            $table->date('date_document')->nullable()->after('taille_octets');
            $table->foreignId('verifie_par_user_id')->nullable()->after('verifie')
                ->constrained('users')->nullOnDelete();
            $table->dateTime('date_verification')->nullable()->after('verifie_par_user_id');
        });

        // ══════════════════════════════════════════════════════════════
        //  12. SALLE — description
        // ══════════════════════════════════════════════════════════════
        Schema::table('salles', function (Blueprint $table) {
            $table->text('description')->nullable()->after('libelle');
        });

        // ══════════════════════════════════════════════════════════════
        //  13. SERVICE — telephone_2
        // ══════════════════════════════════════════════════════════════
        Schema::table('services', function (Blueprint $table) {
            $table->string('telephone_2')->nullable()->after('telephone');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('telephone_2');
        });
        Schema::table('salles', function (Blueprint $table) {
            $table->dropColumn('description');
        });
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['type', 'nom_fichier_original', 'date_document', 'date_verification']);
            $table->dropConstrainedForeignId('verifie_par_user_id');
        });
        Schema::table('dossier_patients', function (Blueprint $table) {
            $table->dropColumn('date_fermeture');
            $table->dropConstrainedForeignId('structure_id');
            $table->dropConstrainedForeignId('user_id');
        });
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->dropColumn(['type_resume', 'date_annulation']);
            $table->dropConstrainedForeignId('dossier_patient_id');
            $table->dropConstrainedForeignId('type_facturation_id');
        });
        Schema::table('antecedents', function (Blueprint $table) {
            $table->dropColumn(['code_cim', 'resolution', 'filiation', 'date_naissance_parent', 'date_deces_parent']);
            $table->dropConstrainedForeignId('consultation_id');
            $table->renameColumn('libelle', 'intitule');
            $table->renameColumn('date_evenement', 'date_diagnostic');
        });
        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn(['date_demande', 'date_examen', 'date_reception_resultat']);
            $table->dropConstrainedForeignId('type_examen_id');
            $table->renameColumn('libelle', 'intitule');
        });
        Schema::table('diagnostics', function (Blueprint $table) {
            $table->dropConstrainedForeignId('type_diagnostic_id');
            $table->renameColumn('libelle', 'intitule');
        });
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropColumn(['type', 'date_debut', 'date_fin', 'tolerance']);
        });
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn(['histoire_maladie_symptomes', 'conclusion_medicale', 'conduite_a_tenir']);
        });
        Schema::table('consultations', function (Blueprint $table) {
            $table->renameColumn('motif_principal', 'motif');
        });
        Schema::table('structures', function (Blueprint $table) {
            $table->dropColumn(['telephone_2', 'date_creation']);
            $table->dropConstrainedForeignId('parent_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['lieu_naissance', 'date_naissance', 'last_activity_at']);
        });
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['lieu_naissance', 'nom_personne_prevenir', 'prenom_personne_prevenir', 'filiation_personne_prevenir', 'telephone_personne_prevenir']);
        });
    }
};
