<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_consents', function (Blueprint $table) {
            $table->id();

            // ── Type & version ──
            $table->string('type');            // teleconsultation, donnees_medicales, partage_dossier, traitement, recherche
            $table->unsignedSmallInteger('version')->default(1);
            $table->text('texte_consentement'); // texte exact présenté au patient

            // ── Décision ──
            $table->boolean('accepted');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('motif_revocation')->nullable();

            // ── Proxy / tuteur ──
            $table->boolean('is_proxy')->default(false);
            $table->string('proxy_nom')->nullable();         // nom du tuteur/représentant
            $table->string('proxy_lien')->nullable();         // lien de parenté / qualité juridique
            $table->string('proxy_piece_identite')->nullable(); // référence pièce d'identité

            // ── Relations ──
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();             // qui a donné/enregistré le consentement
            $table->foreignId('revoked_by')->nullable()->constrained('users')->nullOnDelete();  // qui a révoqué
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->foreignId('rendez_vous_id')->nullable()->constrained('rendez_vous')->nullOnDelete();

            // ── Métadonnées ──
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Index pour recherche rapide
            $table->index(['patient_id', 'type', 'accepted']);
            $table->index(['patient_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_consents');
    }
};
