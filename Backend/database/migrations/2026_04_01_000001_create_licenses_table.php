<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Modules licenciables ──────────────────────────────────────────────
        Schema::create('license_modules', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();          // ex: core, fhir, dicom, cda, dhis2, icd11, snomed, teleexpertise, pacs
            $table->string('libelle');                       // Nom d'affichage
            $table->text('description')->nullable();
            $table->unsignedInteger('prix_unitaire_fcfa')->default(0); // Prix annuel du module (FCFA)
            $table->boolean('inclus_base')->default(false);            // Inclus dans le prix de base ?
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });

        // ── Licences (par structure) ──────────────────────────────────────────
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->string('license_key', 64)->unique();               // Clé de licence unique (SHA-256 hex)
            $table->foreignId('structure_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['demo', 'annuelle', 'pluriannuelle'])->default('demo');
            $table->enum('statut', ['active', 'expiree', 'suspendue', 'annulee'])->default('active');

            // ── Critères de tarification ──────────────────────────────────
            $table->string('type_centre');                              // Ex: CSPS, CM, CMA, CHR, CHU, clinique_privee, cabinet
            $table->unsignedInteger('capacite_lits')->default(0);       // Nombre de lits
            $table->unsignedInteger('max_utilisateurs')->default(10);   // Plafond d'utilisateurs simultanés
            $table->unsignedInteger('nombre_sites')->default(1);        // Multi-site

            // ── Zone géographique ──────────────────────────────────────────
            $table->string('zone_sanitaire')->nullable();               // District / Région
            $table->string('pays', 3)->default('BFA');                  // Code ISO 3166-1 alpha-3

            // ── Montants ──────────────────────────────────────────────────
            $table->unsignedBigInteger('montant_base_fcfa')->default(0);
            $table->unsignedBigInteger('montant_modules_fcfa')->default(0);
            $table->unsignedBigInteger('montant_total_fcfa')->default(0);

            // ── Dates ─────────────────────────────────────────────────────
            $table->date('date_debut');
            $table->date('date_fin');
            $table->date('date_renouvellement')->nullable();

            // ── Méta ──────────────────────────────────────────────────────
            $table->text('notes')->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['structure_id', 'statut']);
            $table->index('date_fin');
        });

        // ── Pivot : licence ↔ modules activés ────────────────────────────────
        Schema::create('license_license_module', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_id')->constrained()->cascadeOnDelete();
            $table->foreignId('license_module_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['license_id', 'license_module_id'], 'lic_mod_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('license_license_module');
        Schema::dropIfExists('licenses');
        Schema::dropIfExists('license_modules');
    }
};
