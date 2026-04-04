<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('pays_id')->references('id')->on('pays')->nullOnDelete();
            $table->foreign('localite_id')->references('id')->on('localites')->nullOnDelete();
            $table->foreign('grade_id')->references('id')->on('grades')->nullOnDelete();
            $table->foreign('type_professionnel_sante_id')->references('id')->on('type_professionnel_santes')->nullOnDelete();
            $table->foreign('structure_id')->references('id')->on('structures')->nullOnDelete();
            $table->foreign('service_id')->references('id')->on('services')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['pays_id']);
            $table->dropForeign(['localite_id']);
            $table->dropForeign(['grade_id']);
            $table->dropForeign(['type_professionnel_sante_id']);
            $table->dropForeign(['structure_id']);
            $table->dropForeign(['service_id']);
        });
    }
};