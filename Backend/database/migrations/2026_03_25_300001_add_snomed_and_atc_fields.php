<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SNOMED CT sur diagnostics
        Schema::table('diagnostics', function (Blueprint $table) {
            $table->string('snomed_code', 20)->nullable()->after('uri_icd11')->index();
            $table->string('snomed_display')->nullable()->after('snomed_code');
        });

        // SNOMED CT sur antécédents
        Schema::table('antecedents', function (Blueprint $table) {
            $table->string('snomed_code', 20)->nullable()->after('uri_icd11')->index();
            $table->string('snomed_display')->nullable()->after('snomed_code');
        });

        // ATC + SNOMED CT sur prescriptions
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->string('atc_code', 10)->nullable()->after('signee')->index();
            $table->string('atc_display')->nullable()->after('atc_code');
            $table->string('snomed_code', 20)->nullable()->after('atc_display')->index();
            $table->string('snomed_display')->nullable()->after('snomed_code');
        });

        // ATC + SNOMED CT sur traitements
        Schema::table('traitements', function (Blueprint $table) {
            $table->string('atc_code', 10)->nullable()->after('statut')->index();
            $table->string('atc_display')->nullable()->after('atc_code');
            $table->string('snomed_code', 20)->nullable()->after('atc_display')->index();
            $table->string('snomed_display')->nullable()->after('snomed_code');
        });

        // SNOMED CT sur examens (type d'examen codé)
        Schema::table('examens', function (Blueprint $table) {
            $table->string('snomed_code', 20)->nullable()->after('urgent')->index();
            $table->string('snomed_display')->nullable()->after('snomed_code');
            $table->string('loinc_code', 20)->nullable()->after('snomed_display')->index();
            $table->string('loinc_display')->nullable()->after('loinc_code');
        });

        // SNOMED CT sur actes
        Schema::table('actes', function (Blueprint $table) {
            $table->string('snomed_code', 20)->nullable()->after('type_acte_id')->index();
            $table->string('snomed_display')->nullable()->after('snomed_code');
        });
    }

    public function down(): void
    {
        Schema::table('diagnostics', function (Blueprint $table) {
            $table->dropColumn(['snomed_code', 'snomed_display']);
        });

        Schema::table('antecedents', function (Blueprint $table) {
            $table->dropColumn(['snomed_code', 'snomed_display']);
        });

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropColumn(['atc_code', 'atc_display', 'snomed_code', 'snomed_display']);
        });

        Schema::table('traitements', function (Blueprint $table) {
            $table->dropColumn(['atc_code', 'atc_display', 'snomed_code', 'snomed_display']);
        });

        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn(['snomed_code', 'snomed_display', 'loinc_code', 'loinc_display']);
        });

        Schema::table('actes', function (Blueprint $table) {
            $table->dropColumn(['snomed_code', 'snomed_display']);
        });
    }
};
