<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teleexpertises', function (Blueprint $table) {
            $table->string('specialite_demandee')->nullable()->after('description');
            $table->text('resume_clinique')->nullable()->after('specialite_demandee');
            $table->text('question')->nullable()->after('resume_clinique');
            $table->string('age_patient')->nullable()->after('question');
            $table->string('genre_patient')->nullable()->after('age_patient');

            // Rendre expert_id nullable (assignment auto possible)
            $table->foreignId('expert_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('teleexpertises', function (Blueprint $table) {
            $table->dropColumn(['specialite_demandee', 'resume_clinique', 'question', 'age_patient', 'genre_patient']);
        });
    }
};
