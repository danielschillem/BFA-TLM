<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificat_deces', function (Blueprint $table) {
            $table->string('nom_defunt')->nullable()->after('dossier_patient_id');
            $table->string('prenoms_defunt')->nullable()->after('nom_defunt');
            $table->date('date_naissance_defunt')->nullable()->after('prenoms_defunt');
            $table->string('lieu_naissance_defunt')->nullable()->after('date_naissance_defunt');
            $table->string('nationalite_defunt')->nullable()->after('lieu_naissance_defunt');
            $table->string('profession_defunt')->nullable()->after('nationalite_defunt');
            $table->string('adresse_defunt', 500)->nullable()->after('profession_defunt');
        });
    }

    public function down(): void
    {
        Schema::table('certificat_deces', function (Blueprint $table) {
            $table->dropColumn([
                'nom_defunt',
                'prenoms_defunt',
                'date_naissance_defunt',
                'lieu_naissance_defunt',
                'nationalite_defunt',
                'profession_defunt',
                'adresse_defunt',
            ]);
        });
    }
};