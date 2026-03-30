<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('constantes', function (Blueprint $table) {
            $table->foreignId('consultation_id')->nullable()->after('user_id')
                  ->constrained('consultations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('constantes', function (Blueprint $table) {
            $table->dropForeign(['consultation_id']);
            $table->dropColumn('consultation_id');
        });
    }
};
