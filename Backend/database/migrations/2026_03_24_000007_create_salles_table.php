<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('type_salles', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('salles', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->integer('capacite')->default(1);
            $table->json('equipements')->nullable();
            $table->boolean('actif')->default(true);
            $table->foreignId('structure_id')->constrained('structures')->cascadeOnDelete();
            $table->foreignId('type_salle_id')->nullable()->constrained('type_salles')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salles');
        Schema::dropIfExists('type_salles');
    }
};
