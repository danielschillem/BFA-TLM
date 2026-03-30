<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('localites', function (Blueprint $table) {
            $table->id();
            $table->string('region');
            $table->string('province');
            $table->string('commune');
            $table->string('village')->nullable();
            $table->foreignId('pays_id')->constrained('pays')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['region', 'province', 'commune']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('localites');
    }
};
