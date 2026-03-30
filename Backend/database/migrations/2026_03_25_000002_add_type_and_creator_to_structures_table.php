<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('structures', function (Blueprint $table) {
            $table->foreignId('type_structure_id')->nullable()->after('actif')
                ->constrained('type_structures')->nullOnDelete();
            $table->foreignId('created_by_id')->nullable()->after('type_structure_id')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('structures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('type_structure_id');
            $table->dropConstrainedForeignId('created_by_id');
        });
    }
};
