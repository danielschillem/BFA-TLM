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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenoms');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('telephone_1')->nullable();
            $table->string('telephone_2')->nullable();
            $table->enum('sexe', ['M', 'F'])->nullable();
            $table->string('specialite')->nullable();
            $table->string('matricule')->nullable()->unique();
            $table->string('numero_ordre')->nullable();
            $table->string('photo')->nullable();
            $table->enum('status', ['actif', 'inactif', 'suspendu'])->default('actif');
            $table->timestamp('last_login_at')->nullable();
            $table->string('two_factor_code')->nullable();
            $table->timestamp('two_factor_expires_at')->nullable();
            $table->foreignId('pays_id')->nullable();
            $table->foreignId('localite_id')->nullable();
            $table->foreignId('grade_id')->nullable();
            $table->foreignId('type_professionnel_sante_id')->nullable();
            $table->foreignId('structure_id')->nullable();
            $table->foreignId('service_id')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
