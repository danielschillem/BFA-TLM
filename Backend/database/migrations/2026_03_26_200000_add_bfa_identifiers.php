<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. IPP — Identifiant Permanent du Patient
        Schema::table('patients', function (Blueprint $table) {
            $table->string('ipp', 25)->nullable()->unique()->after('id');
        });

        // 2. Code Structure sanitaire
        Schema::table('structures', function (Blueprint $table) {
            $table->string('code_structure', 25)->nullable()->unique()->after('id');
        });

        // 3. Identifiant national (PS / Gestionnaire / Utilisateur)
        Schema::table('users', function (Blueprint $table) {
            $table->string('identifiant_national', 25)->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('ipp');
        });

        Schema::table('structures', function (Blueprint $table) {
            $table->dropColumn('code_structure');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('identifiant_national');
        });
    }
};
