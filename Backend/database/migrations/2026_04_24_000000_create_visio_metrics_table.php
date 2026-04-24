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
        Schema::create('visio_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('metric', 64);
            $table->unsignedBigInteger('consultation_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->json('data')->nullable();
            $table->string('url', 2000)->nullable();
            $table->string('user_agent', 1000)->nullable();
            $table->timestamps();

            $table->index(['metric', 'created_at']);
            $table->index('consultation_id');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visio_metrics');
    }
};

