<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->decimal('montant_consultation', 10, 2)->default(0)->after('montant');
            $table->decimal('frais_plateforme', 10, 2)->default(0)->after('montant_consultation');
            $table->decimal('frais_mobile_money', 10, 2)->default(0)->after('frais_plateforme');
            // montant = montant_consultation + frais_plateforme + frais_mobile_money
        });
    }

    public function down(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->dropColumn(['montant_consultation', 'frais_plateforme', 'frais_mobile_money']);
        });
    }
};
