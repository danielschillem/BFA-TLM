<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teleexpertises', function (Blueprint $table) {
            $table->text('recommandations')->nullable()->after('reponse');
            $table->boolean('suivi_requis')->default(false)->after('recommandations');
        });
    }

    public function down(): void
    {
        Schema::table('teleexpertises', function (Blueprint $table) {
            $table->dropColumn(['recommandations', 'suivi_requis']);
        });
    }
};
