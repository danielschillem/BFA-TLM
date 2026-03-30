<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('icd11_chapters', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->nullable()->index();
            $table->string('code_range', 30)->nullable();
            $table->string('title');
            $table->text('definition')->nullable();
            $table->string('uri', 500)->unique();
            $table->string('class_kind', 50)->nullable();            // chapter, block, category, window
            $table->string('browser_url', 500)->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->unsignedSmallInteger('depth')->default(0);       // 0=chapitre, 1=bloc, 2=catégorie…
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_leaf')->default(false);
            $table->boolean('is_residual')->default(false);          // codes "autres/non classés"
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('icd11_chapters')->nullOnDelete();
            $table->index('parent_id');
            $table->index('depth');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('icd11_chapters');
    }
};
