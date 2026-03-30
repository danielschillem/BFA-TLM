<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->unsignedTinyInteger('video_rating')->nullable()->comment('1-5 étoiles');
            $table->string('video_rating_comment', 500)->nullable();
            $table->foreignId('video_rated_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropForeign(['video_rated_by']);
            $table->dropColumn(['video_rating', 'video_rating_comment', 'video_rated_by']);
        });
    }
};
