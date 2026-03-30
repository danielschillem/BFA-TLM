<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Documents médicaux (polymorphe)
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->text('description')->nullable(); // chiffré
            $table->string('chemin_fichier');
            $table->string('type_mime');
            $table->unsignedBigInteger('taille_octets')->default(0);
            $table->enum('niveau_confidentialite', ['normal', 'confidentiel', 'tres_confidentiel'])->default('normal');
            $table->boolean('verifie')->default(false);
            $table->nullableMorphs('documentable'); // polymorphe
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // uploadé par
            $table->timestamps();
            $table->softDeletes();
        });

        // Localisations (polymorphe)
        Schema::create('localisations', function (Blueprint $table) {
            $table->id();
            $table->string('adresse_1')->nullable();
            $table->string('adresse_2')->nullable();
            $table->string('code_postal')->nullable();
            $table->string('ville')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->nullableMorphs('proprietaire'); // polymorphe
            $table->timestamps();
        });

        // Messages
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->text('contenu'); // chiffré
            $table->boolean('lu')->default(false);
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['sender_id', 'recipient_id']);
        });

        // Téléexpertise
        Schema::create('teleexpertises', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->text('description'); // chiffré
            $table->enum('statut', ['en_attente', 'acceptee', 'rejetee', 'repondue'])->default('en_attente');
            $table->enum('priorite', ['normale', 'haute', 'urgente'])->default('normale');
            $table->text('reponse')->nullable(); // chiffré
            $table->text('motif_rejet')->nullable();
            $table->foreignId('demandeur_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('expert_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teleexpertises');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('localisations');
        Schema::dropIfExists('documents');
    }
};
