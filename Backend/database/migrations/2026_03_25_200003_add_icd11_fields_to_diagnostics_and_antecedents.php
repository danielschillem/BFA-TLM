<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ajouter les champs ICD-11 aux diagnostics
        Schema::table('diagnostics', function (Blueprint $table) {
            $table->string('code_icd11', 30)->nullable()->after('code_cim');
            $table->string('titre_icd11')->nullable()->after('code_icd11');
            $table->string('uri_icd11')->nullable()->after('titre_icd11');
        });

        // Ajouter les champs ICD-11 aux antécédents
        Schema::table('antecedents', function (Blueprint $table) {
            $table->string('code_icd11', 30)->nullable()->after('code_cim');
            $table->string('titre_icd11')->nullable()->after('code_icd11');
            $table->string('uri_icd11')->nullable()->after('titre_icd11');
        });
    }

    public function down(): void
    {
        Schema::table('diagnostics', function (Blueprint $table) {
            $table->dropColumn(['code_icd11', 'titre_icd11', 'uri_icd11']);
        });

        Schema::table('antecedents', function (Blueprint $table) {
            $table->dropColumn(['code_icd11', 'titre_icd11', 'uri_icd11']);
        });
    }
};
