<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dicom_studies', function (Blueprint $table) {
            $table->id();

            // ── Identifiants DICOM ──
            $table->string('study_instance_uid')->unique();          // 0020,000D
            $table->string('accession_number')->nullable();          // 0008,0050
            $table->string('study_id')->nullable();                  // 0020,0010

            // ── Description ──
            $table->string('study_description')->nullable();         // 0008,1030
            $table->string('modality')->nullable();                  // 0008,0060 (CR, CT, MR, US, XA, DX...)
            $table->string('body_part_examined')->nullable();        // 0018,0015
            $table->dateTime('study_date')->nullable();              // 0008,0020 + 0008,0030

            // ── Patient DICOM (pour rapprochement) ──
            $table->string('patient_dicom_id')->nullable();          // 0010,0020
            $table->string('patient_dicom_name')->nullable();        // 0010,0010

            // ── Compteurs ──
            $table->unsignedInteger('number_of_series')->default(0);    // 0020,1206
            $table->unsignedInteger('number_of_instances')->default(0); // 0020,1208

            // ── Statut ──
            $table->enum('statut', ['recu', 'en_lecture', 'lu', 'valide'])->default('recu');
            $table->string('referring_physician')->nullable();       // 0008,0090
            $table->text('interpretation')->nullable();              // Compte-rendu radiologique

            // ── Relations TLM-BFA ──
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->foreignId('examen_id')->nullable()->constrained('examens')->nullOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Index
            $table->index(['patient_id', 'modality']);
            $table->index('study_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dicom_studies');
    }
};
