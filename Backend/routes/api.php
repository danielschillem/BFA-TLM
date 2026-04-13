<?php

use App\Http\Controllers\API\AllergieController;
use App\Http\Controllers\API\AdminController;
use App\Http\Controllers\API\AnnouncementController;
use App\Http\Controllers\API\AntecedentController;
use App\Http\Controllers\API\AppointmentController;
use App\Http\Controllers\API\AuditController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\CertificatDecesController;
use App\Http\Controllers\API\LicenseController;
use App\Http\Controllers\API\ConstanteController;
use App\Http\Controllers\API\ConsultationController;
use App\Http\Controllers\API\DiagnosticController;
use App\Http\Controllers\API\Dhis2Controller;
use App\Http\Controllers\API\DicomController;
use App\Http\Controllers\API\DirectoryController;
use App\Http\Controllers\API\DocumentController;
use App\Http\Controllers\API\ExamenController;
use App\Http\Controllers\API\CdaController;
use App\Http\Controllers\API\FhirController;
use App\Http\Controllers\API\Icd11Controller;
use App\Http\Controllers\API\GestionnaireController;
use App\Http\Controllers\API\HabitudeDeVieController;
use App\Http\Controllers\API\MessageController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\PatientConsentController;
use App\Http\Controllers\API\PatientController;
use App\Http\Controllers\API\PaymentController;
use App\Http\Controllers\API\PlatformSettingsController;
use App\Http\Controllers\API\RolePermissionController;
use App\Http\Controllers\API\PrescriptionController;
use App\Http\Controllers\API\StructureManagementController;
use App\Http\Controllers\API\TeleexpertiseController;
use App\Http\Controllers\API\TerminologyController;
use App\Http\Controllers\API\TraitementController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — TLM_APP-BFA
|--------------------------------------------------------------------------
| Préfixe : /api/v1
| Middleware : api (rate limiting, etc.)
*/

// ── Diagnostic endpoint (admin seulement — ne jamais exposer en public) ───────
Route::get('/diag', function () {
    try {
        $checks = [];

        // 1. Database connection
        try {
            $checks['database'] = ['ok' => true, 'tables' => \Illuminate\Support\Facades\DB::select("SELECT count(*) as c FROM sqlite_master WHERE type='table'")[0]->c ?? 0];
        } catch (\Throwable $e) {
            $checks['database'] = ['ok' => false, 'error' => 'Connection failed'];
        }

        // 2. Passport client
        try {
            $client = \Laravel\Passport\Client::where('name', 'TLM Personal Access Client')->first();
            $checks['passport_client'] = ['ok' => (bool) $client];
        } catch (\Throwable $e) {
            $checks['passport_client'] = ['ok' => false];
        }

        // 3. Roles
        try {
            $checks['roles'] = ['ok' => \Spatie\Permission\Models\Role::count() > 0];
        } catch (\Throwable $e) {
            $checks['roles'] = ['ok' => false];
        }

        // 4. Passport keys
        $checks['passport_keys'] = [
            'ok' => file_exists(storage_path('oauth-private.key')) && file_exists(storage_path('oauth-public.key')),
        ];

        // 5. APP_KEY
        $checks['app_key'] = ['ok' => !empty(config('app.key'))];

        $allOk = collect($checks)->every(fn($c) => $c['ok'] ?? false);

        return response()->json([
            'status' => $allOk ? 'healthy' : 'degraded',
            'checks' => $checks,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Internal check failed',
        ], 500);
    }
})->middleware(['auth:api', 'role:admin']);

// ── Auth (public) ─────────────────────────────────────────────────────────────

// ── FHIR R4 (interopérabilité) ────────────────────────────────────────────────
Route::prefix('fhir')->middleware(['auth:api', 'active', 'throttle:interop'])->group(function () {
    // Metadata (CapabilityStatement)
    Route::get('/metadata', [FhirController::class, 'metadata'])->withoutMiddleware(['auth:api', 'active']);

    // Patient
    Route::get('/Patient', [FhirController::class, 'patientSearch']);
    Route::get('/Patient/{id}', [FhirController::class, 'patientRead']);
    Route::get('/Patient/{id}/$everything', [FhirController::class, 'patientEverything']);

    // Practitioner
    Route::get('/Practitioner', [FhirController::class, 'practitionerSearch']);
    Route::get('/Practitioner/{id}', [FhirController::class, 'practitionerRead']);

    // Organization
    Route::get('/Organization', [FhirController::class, 'organizationSearch']);
    Route::get('/Organization/{id}', [FhirController::class, 'organizationRead']);

    // Encounter
    Route::get('/Encounter', [FhirController::class, 'encounterSearch']);
    Route::get('/Encounter/{id}', [FhirController::class, 'encounterRead']);

    // Observation (Vital Signs)
    Route::get('/Observation', [FhirController::class, 'observationSearch']);

    // Condition (Diagnostics + Antécédents)
    Route::get('/Condition', [FhirController::class, 'conditionSearch']);
    Route::get('/Condition/{id}', [FhirController::class, 'conditionRead'])->where('id', '[a-z]+-?\d+|\d+');

    // AllergyIntolerance
    Route::get('/AllergyIntolerance', [FhirController::class, 'allergyIntoleranceSearch']);
    Route::get('/AllergyIntolerance/{id}', [FhirController::class, 'allergyIntoleranceRead']);

    // MedicationRequest
    Route::get('/MedicationRequest', [FhirController::class, 'medicationRequestSearch']);
    Route::get('/MedicationRequest/{id}', [FhirController::class, 'medicationRequestRead']);

    // DiagnosticReport
    Route::get('/DiagnosticReport', [FhirController::class, 'diagnosticReportSearch']);
    Route::get('/DiagnosticReport/{id}', [FhirController::class, 'diagnosticReportRead']);

    // Appointment
    Route::get('/Appointment', [FhirController::class, 'appointmentSearch']);
    Route::get('/Appointment/{id}', [FhirController::class, 'appointmentRead']);

    // Consent
    Route::get('/Consent', [FhirController::class, 'consentSearch']);
    Route::get('/Consent/{id}', [FhirController::class, 'consentRead']);

    // ImagingStudy
    Route::get('/ImagingStudy', [FhirController::class, 'imagingStudySearch']);
    Route::get('/ImagingStudy/{id}', [FhirController::class, 'imagingStudyRead']);
});

// ── CDA R2 (documents cliniques XML) ──────────────────────────────────────────
Route::prefix('cda')->middleware(['auth:api', 'active', 'throttle:interop'])->group(function () {
    // Metadata (capacités CDA R2 — public, sans auth)
    Route::get('/metadata', [CdaController::class, 'metadata'])->withoutMiddleware(['auth:api', 'active']);

    // Patient CCD (Continuity of Care Document)
    Route::get('/Patient/{id}/ccd', [CdaController::class, 'patientCcd']);

    // Patient Summary (alias CCD)
    Route::get('/Patient/{id}/summary', [CdaController::class, 'patientSummary']);

    // Consultation Note (Compte-Rendu)
    Route::get('/Consultation/{id}/note', [CdaController::class, 'consultationNote']);

    // Validation de document CDA
    Route::post('/validate', [CdaController::class, 'validate']);
});

// ── Terminologies (SNOMED CT + ATC) ───────────────────────────────────────────
Route::prefix('terminology')->middleware(['auth:api', 'active', 'throttle:interop'])->group(function () {
    // Metadata (public, sans auth)
    Route::get('/metadata', [TerminologyController::class, 'metadata'])->withoutMiddleware(['auth:api', 'active']);

    // SNOMED CT
    Route::get('/snomed/search', [TerminologyController::class, 'snomedSearch']);
    Route::get('/snomed/lookup/{conceptId}', [TerminologyController::class, 'snomedLookup'])->where('conceptId', '\d+');
    Route::get('/snomed/validate/{conceptId}', [TerminologyController::class, 'snomedValidate'])->where('conceptId', '\d+');
    Route::get('/snomed/children/{conceptId}', [TerminologyController::class, 'snomedChildren'])->where('conceptId', '\d+');
    Route::get('/snomed/{domain}', [TerminologyController::class, 'snomedDomain'])->where('domain', 'disorders|procedures|findings|substances|body-structures');
    Route::get('/snomed/health', [TerminologyController::class, 'snomedHealth'])->withoutMiddleware(['auth:api', 'active']);

    // ATC
    Route::get('/atc/tree', [TerminologyController::class, 'atcTree']);
    Route::get('/atc/search', [TerminologyController::class, 'atcSearch']);
    Route::get('/atc/lookup/{code}', [TerminologyController::class, 'atcLookup'])->where('code', '[A-Za-z0-9]+');
    Route::get('/atc/children/{code}', [TerminologyController::class, 'atcChildren'])->where('code', '[A-Za-z0-9]+');
    Route::get('/atc/validate/{code}', [TerminologyController::class, 'atcValidate'])->where('code', '[A-Za-z0-9]+');
});

// ── ICD-11 OMS (classification internationale) ────────────────────────────────
Route::prefix('icd11')->middleware(['auth:api', 'active', 'throttle:interop'])->group(function () {
    Route::get('/search', [Icd11Controller::class, 'search']);
    Route::get('/lookup/{code}', [Icd11Controller::class, 'lookup'])->where('code', '[A-Za-z0-9./-]+');
    Route::get('/validate/{code}', [Icd11Controller::class, 'validate'])->where('code', '[A-Za-z0-9./-]+');
    Route::get('/crosswalk/{icd10Code}', [Icd11Controller::class, 'crosswalk'])->where('icd10Code', '[A-Za-z0-9.]+');
    Route::get('/health', [Icd11Controller::class, 'health'])->withoutMiddleware(['auth:api', 'active']);
});

// ── DHIS2 & ENDOS (système national d'information sanitaire) ──────────────────
Route::prefix('dhis2')->middleware(['auth:api', 'active', 'throttle:interop'])->group(function () {
    // Metadata combiné (dashboard interop)
    Route::get('/metadata', [Dhis2Controller::class, 'metadata'])
        ->withoutMiddleware(['auth:api', 'active']);

    // Health check
    Route::get('/health', [Dhis2Controller::class, 'healthCheck']);

    // Indicateurs TLM collectés
    Route::get('/indicators', [Dhis2Controller::class, 'indicators']);

    // Mapping configuration
    Route::get('/mapping', [Dhis2Controller::class, 'mappingConfig']);

    // Org units DHIS2
    Route::get('/organisation-units', [Dhis2Controller::class, 'organisationUnits']);

    // Data elements & datasets
    Route::get('/data-elements', [Dhis2Controller::class, 'dataElements']);
    Route::get('/datasets', [Dhis2Controller::class, 'datasets']);

    // Push (admin seulement)
    Route::post('/push', [Dhis2Controller::class, 'pushIndicators'])
        ->middleware('role:admin');

    // Sync status
    Route::get('/sync-status', [Dhis2Controller::class, 'syncStatus']);

    // ── ENDOS ──
    Route::prefix('endos')->group(function () {
        Route::get('/health', [Dhis2Controller::class, 'endosHealthCheck']);
        Route::get('/org-unit-mapping', [Dhis2Controller::class, 'endosOrgUnitMapping']);
        Route::post('/sync-org-units', [Dhis2Controller::class, 'endosSyncOrgUnits'])
            ->middleware('role:admin');
        Route::post('/push', [Dhis2Controller::class, 'endosPushIndicators'])
            ->middleware('role:admin');
    });
});

Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:password-reset');
    Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:password-reset');
    Route::post('/two-factor/verify', [AuthController::class, 'verifyTwoFactor'])->middleware(['auth:api', 'active']);
    Route::post('/two-factor/resend', [AuthController::class, 'resendTwoFactor'])->middleware(['auth:api', 'active']);

    // Authentifié
    Route::middleware(['auth:api', 'active'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout'])->withoutMiddleware('active');
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'changePassword']);
    });
});

// ── Routes protégées ──────────────────────────────────────────────────────────
Route::middleware(['auth:api', 'active'])->group(function () {

    // Référentiels (pays, localités, grades, types PS)
    Route::get('/pays', fn () => \App\Models\Pays::orderBy('nom')->get(['id', 'nom', 'code', 'indicatif']));
    Route::get('/localites', function (\Illuminate\Http\Request $request) {
        $query = \App\Models\Localite::query();
        if ($request->filled('pays_id')) {
            $query->where('pays_id', $request->pays_id);
        }
        return $query->orderBy('commune')->get(['id', 'region', 'province', 'commune', 'pays_id']);
    });
    Route::get('/grades', fn () => \App\Models\Grade::orderBy('libelle')->get(['id', 'libelle', 'code']));
    Route::get('/type-professionnel-santes', fn () => \App\Models\TypeProfessionnelSante::orderBy('libelle')->get(['id', 'libelle']));
    Route::get('/actes', fn () => \App\Models\Acte::with('typeActe:id,libelle')->orderBy('libelle')->get(['id', 'libelle', 'cout', 'description', 'duree', 'type_acte_id']));
    Route::get('/type-salles', fn () => \App\Models\TypeSalle::orderBy('libelle')->get(['id', 'libelle', 'description']));

    // Annuaire médecins (lecture accessible à tout utilisateur authentifié)
    Route::prefix('directory')->group(function () {
        Route::get('/structures', [DirectoryController::class, 'structures']);
        Route::get('/doctors', [DirectoryController::class, 'searchDoctors']);
        Route::get('/doctors/{id}', [DirectoryController::class, 'getDoctor']);
        Route::get('/specialties', [DirectoryController::class, 'getSpecialties']);
        Route::get('/appointments/slots', [DirectoryController::class, 'getSlots']);
        Route::get('/appointments/availability', [DirectoryController::class, 'getAvailability']);
        // Gestion des disponibilités (médecins/spécialistes uniquement)
        Route::post('/schedule', [DirectoryController::class, 'createSchedule'])->middleware('permission:appointments.update');
        Route::delete('/schedule/{id}', [DirectoryController::class, 'deleteSchedule'])->middleware('permission:appointments.update');
        Route::get('/schedule', [DirectoryController::class, 'mySchedule'])->middleware('permission:appointments.view');
    });

    // Rendez-vous
    Route::prefix('appointments')->group(function () {
        Route::get('/', [AppointmentController::class, 'index'])->middleware('permission:appointments.view');
        Route::post('/', [AppointmentController::class, 'store'])->middleware('permission:appointments.create');
        Route::get('/{id}', [AppointmentController::class, 'show'])->middleware('permission:appointments.view');
        Route::post('/{id}/confirm', [AppointmentController::class, 'confirm'])->middleware('permission:appointments.update');
        Route::post('/{id}/cancel', [AppointmentController::class, 'cancel'])->middleware('permission:appointments.cancel');
        Route::post('/{id}/reject', [AppointmentController::class, 'reject'])->middleware('permission:appointments.update');
        Route::post('/{id}/reschedule', [AppointmentController::class, 'reschedule'])->middleware('permission:appointments.update');
        Route::post('/{id}/delegate', [AppointmentController::class, 'delegate'])->middleware('permission:appointments.update');
        Route::post('/{id}/consent', [AppointmentController::class, 'consent'])->middleware('permission:consents.manage');
        Route::get('/{id}/pdf', [AppointmentController::class, 'downloadPdf'])->middleware(['permission:appointments.view', 'throttle:export']);
    });

    // Consultations
    Route::prefix('consultations')->group(function () {
        Route::get('/', [ConsultationController::class, 'index'])->middleware('permission:consultations.view');
        Route::get('/dashboard', [ConsultationController::class, 'dashboard'])->middleware('permission:consultations.view');
        Route::get('/{id}', [ConsultationController::class, 'show'])->middleware('permission:consultations.view');
        Route::post('/appointments/{appointmentId}/start', [ConsultationController::class, 'startFromAppointment'])->middleware('permission:consultations.create');
        Route::post('/{id}/end', [ConsultationController::class, 'end'])->middleware('permission:consultations.view');
        Route::post('/{id}/report', [ConsultationController::class, 'createReport'])->middleware('permission:consultations.update');
        Route::post('/{id}/report/sign', [ConsultationController::class, 'signReport'])->middleware('permission:consultations.update');
        Route::post('/{id}/report/share', [ConsultationController::class, 'shareReport'])->middleware('permission:consultations.update');
        Route::get('/{id}/report/pdf', [ConsultationController::class, 'downloadReport'])->middleware(['permission:consultations.view', 'throttle:export']);
        Route::get('/{id}/prescription/pdf', [ConsultationController::class, 'downloadPrescription'])->middleware(['permission:consultations.view', 'throttle:export']);
        Route::post('/{id}/consent', [ConsultationController::class, 'consent'])->middleware('permission:consents.manage');
        Route::post('/{id}/medical-parameters', [ConsultationController::class, 'medicalParameters'])->middleware('permission:consultations.update');
        Route::post('/{id}/rate-video', [ConsultationController::class, 'rateVideoQuality'])->middleware('permission:consultations.view');
        Route::post('/{id}/jitsi-token', [ConsultationController::class, 'refreshJitsiToken'])->middleware('permission:consultations.view');
    });

    // Prescriptions
    Route::get('/prescriptions', [PrescriptionController::class, 'index'])->middleware('permission:prescriptions.view');
    Route::post('/consultations/{consultationId}/prescriptions', [PrescriptionController::class, 'store'])->middleware('permission:prescriptions.create');
    Route::post('/prescriptions/{id}/sign', [PrescriptionController::class, 'sign'])->middleware('permission:prescriptions.sign');
    Route::post('/prescriptions/{id}/share', [PrescriptionController::class, 'share'])->middleware('permission:prescriptions.view');

    // Téléexpertise
    Route::prefix('teleexpertise')->group(function () {
        Route::get('/', [TeleexpertiseController::class, 'index'])->middleware('permission:teleexpertise.view');
        Route::post('/', [TeleexpertiseController::class, 'store'])->middleware('permission:teleexpertise.create');
        Route::get('/stats', [TeleexpertiseController::class, 'stats'])->middleware('permission:teleexpertise.view');
        Route::get('/{id}', [TeleexpertiseController::class, 'show'])->middleware('permission:teleexpertise.view');
        Route::post('/{id}/accept', [TeleexpertiseController::class, 'accept'])->middleware('permission:teleexpertise.respond');
        Route::post('/{id}/reject', [TeleexpertiseController::class, 'reject'])->middleware('permission:teleexpertise.respond');
        Route::post('/{id}/respond', [TeleexpertiseController::class, 'respond'])->middleware('permission:teleexpertise.respond');
    });

    // Documents
    Route::get('/documents', [DocumentController::class, 'index'])->middleware('permission:documents.view');
    Route::post('/documents', [DocumentController::class, 'store'])->middleware('permission:documents.upload');
    Route::get('/documents/{id}/download', [DocumentController::class, 'download'])->middleware('permission:documents.view');
    Route::delete('/documents/{id}', [DocumentController::class, 'destroy'])->middleware('permission:documents.delete');

    // Messages
    Route::prefix('messages')->middleware('permission:messages.view')->group(function () {
        Route::get('/inbox', [MessageController::class, 'inbox']);
        Route::get('/unread', [MessageController::class, 'unreadCount']);
        Route::get('/search', [MessageController::class, 'search']);
        Route::get('/conversation/{userId}', [MessageController::class, 'conversation']);
        Route::post('/', [MessageController::class, 'send'])->middleware('permission:messages.send');
        Route::post('/read', [MessageController::class, 'markAsRead']);
        Route::get('/{id}/attachment', [MessageController::class, 'downloadAttachment'])->name('messages.attachment');
        Route::delete('/{id}', [MessageController::class, 'destroy'])->middleware('permission:messages.send');
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // Patients
    Route::prefix('patients')->where(['patient' => '[0-9]+'])->middleware('throttle:sensitive')->group(function () {
        Route::get('/', [PatientController::class, 'index'])->middleware('permission:patients.view');
        Route::post('/', [PatientController::class, 'store'])->middleware('permission:patients.create');
        Route::get('/{patient}', [PatientController::class, 'show'])->middleware('permission:patients.view');
        Route::put('/{patient}', [PatientController::class, 'update'])->middleware('permission:patients.update');
        Route::delete('/{patient}', [PatientController::class, 'destroy'])->middleware('permission:patients.delete');
        Route::get('/{patientId}/record', [PatientController::class, 'getRecord'])->middleware('permission:dossiers.view');
        Route::put('/{patientId}/record', [PatientController::class, 'updateRecord'])->middleware('permission:dossiers.update');
    });

    // ── Dossier médical — sous-entités ────────────────────────────────────────
    // Antécédents
    Route::post('/antecedents', [AntecedentController::class, 'store'])->middleware('permission:dossiers.update');
    Route::put('/antecedents/{id}', [AntecedentController::class, 'update'])->middleware('permission:dossiers.update');
    Route::delete('/antecedents/{id}', [AntecedentController::class, 'destroy'])->middleware('permission:dossiers.update');

    // Allergies
    Route::post('/allergies', [AllergieController::class, 'store'])->middleware('permission:dossiers.update');
    Route::put('/allergies/{id}', [AllergieController::class, 'update'])->middleware('permission:dossiers.update');
    Route::delete('/allergies/{id}', [AllergieController::class, 'destroy'])->middleware('permission:dossiers.update');

    // Diagnostics
    Route::post('/diagnostics', [DiagnosticController::class, 'store'])->middleware('permission:consultations.update');
    Route::put('/diagnostics/{id}', [DiagnosticController::class, 'update'])->middleware('permission:consultations.update');
    Route::delete('/diagnostics/{id}', [DiagnosticController::class, 'destroy'])->middleware('permission:consultations.update');

    // Examens
    Route::post('/examens', [ExamenController::class, 'store'])->middleware('permission:consultations.update');
    Route::put('/examens/{id}', [ExamenController::class, 'update'])->middleware('permission:consultations.update');
    Route::delete('/examens/{id}', [ExamenController::class, 'destroy'])->middleware('permission:consultations.update');

    // Traitements
    Route::post('/traitements', [TraitementController::class, 'store'])->middleware('permission:consultations.update');
    Route::put('/traitements/{id}', [TraitementController::class, 'update'])->middleware('permission:consultations.update');
    Route::delete('/traitements/{id}', [TraitementController::class, 'destroy'])->middleware('permission:consultations.update');

    // Habitudes de vie
    Route::post('/habitudes-de-vie', [HabitudeDeVieController::class, 'store'])->middleware('permission:dossiers.update');
    Route::put('/habitudes-de-vie/{id}', [HabitudeDeVieController::class, 'update'])->middleware('permission:dossiers.update');
    Route::delete('/habitudes-de-vie/{id}', [HabitudeDeVieController::class, 'destroy'])->middleware('permission:dossiers.update');

    // Constantes (historique par dossier)
    Route::get('/dossiers/{dossierId}/constantes', [ConstanteController::class, 'index'])->middleware('permission:dossiers.view');

    // Audit
    Route::prefix('audit')->group(function () {
        Route::get('/my-logs', [AuditController::class, 'myLogs']);
        Route::get('/logs', [AuditController::class, 'index'])->middleware('permission:admin.audit');
        Route::get('/report', [AuditController::class, 'report'])->middleware('permission:admin.audit');
    });

    // Admin
    Route::prefix('admin')->middleware(['role:admin', 'throttle:admin'])->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard'])->middleware('permission:admin.dashboard');
        Route::get('/users', [AdminController::class, 'listUsers'])->middleware('permission:admin.users');
        Route::post('/users', [AdminController::class, 'storeUser'])->middleware('permission:admin.users');
        Route::get('/users/{id}', [AdminController::class, 'showUser'])->middleware('permission:admin.users');
        Route::put('/users/{id}', [AdminController::class, 'updateUser'])->middleware('permission:admin.users');
        Route::delete('/users/{id}', [AdminController::class, 'destroyUser'])->middleware('permission:admin.users');
        Route::patch('/users/{id}/status', [AdminController::class, 'updateUserStatus'])->middleware('permission:admin.users');
        Route::post('/users/{id}/verify', [AdminController::class, 'verifyDoctor'])->middleware('permission:admin.users');

        // ── Rôles & Permissions (Admin) ──
        Route::prefix('roles')->middleware('permission:admin.users')->group(function () {
            Route::get('/', [RolePermissionController::class, 'indexRoles']);
            Route::post('/', [RolePermissionController::class, 'storeRole']);
            Route::get('/{id}', [RolePermissionController::class, 'showRole']);
            Route::put('/{id}', [RolePermissionController::class, 'updateRole']);
            Route::delete('/{id}', [RolePermissionController::class, 'destroyRole']);
        });
        Route::get('/permissions', [RolePermissionController::class, 'indexPermissions'])->middleware('permission:admin.users');
        Route::get('/roles-matrix', [RolePermissionController::class, 'matrix'])->middleware('permission:admin.users');
        Route::get('/users/{userId}/roles', [RolePermissionController::class, 'userRoles'])->middleware('permission:admin.users');
        Route::post('/users/{userId}/roles', [RolePermissionController::class, 'assignRole'])->middleware('permission:admin.users');

        // ── Types de structure (Admin) ──
        Route::prefix('type-structures')->middleware('permission:structures.manage')->group(function () {
            Route::get('/', [StructureManagementController::class, 'indexTypeStructures']);
            Route::post('/', [StructureManagementController::class, 'storeTypeStructure']);
            Route::get('/{id}', [StructureManagementController::class, 'showTypeStructure']);
            Route::put('/{id}', [StructureManagementController::class, 'updateTypeStructure']);
            Route::delete('/{id}', [StructureManagementController::class, 'destroyTypeStructure']);
        });

        // ── Structures (Admin) ──
        Route::prefix('structures')->middleware('permission:structures.manage')->group(function () {
            Route::get('/', [StructureManagementController::class, 'indexStructures']);
            Route::post('/', [StructureManagementController::class, 'storeStructure']);
            Route::get('/{id}', [StructureManagementController::class, 'showStructure']);
            Route::put('/{id}', [StructureManagementController::class, 'updateStructure']);
            Route::delete('/{id}', [StructureManagementController::class, 'destroyStructure']);

            // Services d'une structure
            Route::get('/{structureId}/services', [StructureManagementController::class, 'indexServices']);
            Route::post('/{structureId}/services', [StructureManagementController::class, 'storeService']);
            Route::put('/{structureId}/services/{serviceId}', [StructureManagementController::class, 'updateService']);
            Route::delete('/{structureId}/services/{serviceId}', [StructureManagementController::class, 'destroyService']);
        });

        // ── Gestionnaires (Admin) ──
        Route::prefix('gestionnaires')->middleware('permission:admin.users')->group(function () {
            Route::get('/', [StructureManagementController::class, 'indexGestionnaires']);
            Route::post('/', [StructureManagementController::class, 'storeGestionnaire']);
        });

        // ── Annonces (Admin CRUD) ──
        Route::get('/announcements', [AnnouncementController::class, 'adminIndex']);
        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::get('/announcements/{id}', [AnnouncementController::class, 'show']);
        Route::put('/announcements/{id}', [AnnouncementController::class, 'update']);
        Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy']);

        // ── Paramètres de la plateforme (Admin) ──
        Route::prefix('settings')->middleware('permission:admin.settings')->group(function () {
            Route::get('/', [PlatformSettingsController::class, 'index']);
            Route::put('/{key}', [PlatformSettingsController::class, 'update']);
            Route::put('/', [PlatformSettingsController::class, 'batchUpdate']);
        });
    });

    // Annonces publiées (tous utilisateurs authentifiés)
    Route::get('/announcements', [AnnouncementController::class, 'index']);

    // ── Gestionnaire (structure_manager) — Gestion des PS ──
    Route::prefix('gestionnaire')->middleware('role:structure_manager')->group(function () {
        Route::get('/dashboard', [GestionnaireController::class, 'dashboard']);

        // Professionnels de santé
        Route::prefix('professionnels')->group(function () {
            Route::get('/', [GestionnaireController::class, 'indexProfessionnels']);
            Route::post('/', [GestionnaireController::class, 'storeProfessionnel']);
            Route::get('/{id}', [GestionnaireController::class, 'showProfessionnel']);
            Route::put('/{id}', [GestionnaireController::class, 'updateProfessionnel']);
            Route::patch('/{id}/toggle-status', [GestionnaireController::class, 'toggleStatusProfessionnel']);
        });

        // Services de la structure
        Route::get('/services', [GestionnaireController::class, 'indexServices']);
        Route::post('/services', [GestionnaireController::class, 'storeService']);

        // Salles de la structure
        Route::prefix('salles')->group(function () {
            Route::get('/', [GestionnaireController::class, 'indexSalles']);
            Route::post('/', [GestionnaireController::class, 'storeSalle']);
            Route::put('/{id}', [GestionnaireController::class, 'updateSalle']);
            Route::delete('/{id}', [GestionnaireController::class, 'destroySalle']);
        });
    });

    // Consentements patient (OMS / RGPD)
    Route::prefix('consents')->group(function () {
        Route::get('/', [PatientConsentController::class, 'index'])->middleware('permission:consents.view');
        Route::post('/', [PatientConsentController::class, 'store'])->middleware('permission:consents.manage');
        Route::get('/check', [PatientConsentController::class, 'check'])->middleware('permission:consents.view');
        Route::get('/{id}', [PatientConsentController::class, 'show'])->middleware('permission:consents.view');
        Route::post('/{id}/withdraw', [PatientConsentController::class, 'withdraw'])->middleware('permission:consents.manage');
        Route::get('/patient/{patientId}/history', [PatientConsentController::class, 'patientHistory'])->middleware('permission:consents.view');
    });

    // Paiements
    Route::prefix('payments')->group(function () {
        Route::post('/consultations/{consultationId}/initiate', [PaymentController::class, 'initiate'])->middleware('permission:payments.initiate');
        Route::post('/appointments/{appointmentId}/initiate', [PaymentController::class, 'initiateForAppointment'])->middleware('permission:payments.initiate');
        Route::post('/confirm', [PaymentController::class, 'confirm'])->middleware('permission:payments.confirm');
        Route::post('/{id}/doctor-validate', [PaymentController::class, 'doctorValidate'])->middleware('permission:payments.validate');
        Route::get('/{id}/invoice', [PaymentController::class, 'downloadInvoice'])->middleware('permission:payments.view');
        Route::get('/statement', [PaymentController::class, 'statement'])->middleware('permission:payments.view');
        // Paramètres de frais publics (pour afficher au patient)
        Route::get('/settings', [PlatformSettingsController::class, 'publicSettings']);
        // Calculer les frais avant paiement
        Route::post('/calculate-fees', [PaymentController::class, 'calculateFees']);
    });

    // Imagerie médicale (DICOM / dcm4chee-arc)
    Route::prefix('dicom')->middleware('throttle:sensitive')->group(function () {
        Route::get('/health', [DicomController::class, 'healthCheck']);
        Route::get('/studies', [DicomController::class, 'index'])->middleware('permission:consultations.view');
        Route::post('/studies', [DicomController::class, 'store'])->middleware('permission:consultations.update');
        Route::get('/studies/{id}', [DicomController::class, 'show'])->middleware('permission:consultations.view');
        Route::put('/studies/{id}', [DicomController::class, 'update'])->middleware('permission:consultations.update');
        Route::post('/upload', [DicomController::class, 'upload'])->middleware('permission:consultations.update');
        Route::post('/sync', [DicomController::class, 'syncFromPacs'])->middleware('permission:consultations.update');

        // Proxy DICOMweb (WADO-RS) pour le viewer frontend
        Route::get('/studies/{id}/series', [DicomController::class, 'series'])->middleware('permission:consultations.view');
        Route::get('/studies/{id}/series/{seriesUid}/instances', [DicomController::class, 'instances'])->middleware('permission:consultations.view');
        Route::get('/studies/{id}/series/{seriesUid}/instances/{instanceUid}/frames/{frame}', [DicomController::class, 'renderFrame'])->middleware('permission:consultations.view');
        Route::get('/studies/{id}/thumbnail', [DicomController::class, 'thumbnail'])->middleware('permission:consultations.view');
    });

    // Certification des causes de décès (modèle OMS + CIM-11)
    Route::prefix('certificats-deces')->middleware('throttle:sensitive')->group(function () {
        Route::get('/', [CertificatDecesController::class, 'index'])->middleware('permission:dossiers.view');
        Route::post('/', [CertificatDecesController::class, 'store'])->middleware('permission:dossiers.update');
        Route::get('/statistiques', [CertificatDecesController::class, 'statistiques'])->middleware('permission:dossiers.view');
        Route::get('/{id}', [CertificatDecesController::class, 'show'])->middleware('permission:dossiers.view');
        Route::put('/{id}', [CertificatDecesController::class, 'update'])->middleware('permission:dossiers.update');
        Route::post('/{id}/certifier', [CertificatDecesController::class, 'certifier'])->middleware('permission:dossiers.update');
        Route::post('/{id}/valider', [CertificatDecesController::class, 'valider'])->middleware('permission:admin.audit');
        Route::post('/{id}/rejeter', [CertificatDecesController::class, 'rejeter'])->middleware('permission:admin.audit');
        Route::post('/{id}/annuler', [CertificatDecesController::class, 'annuler'])->middleware('permission:dossiers.update');
    });
});

// ── Licences & Démo ───────────────────────────────────────────────────────────

// Routes publiques (grille tarifaire & simulation)
Route::prefix('licenses')->group(function () {
    Route::get('/grille', [LicenseController::class, 'grille']);
    Route::post('/simuler', [LicenseController::class, 'simuler']);
    Route::get('/modules', [LicenseController::class, 'modules']);
});

// Routes authentifiées
Route::prefix('licenses')->middleware(['auth:api', 'active'])->group(function () {
    Route::post('/demo', [LicenseController::class, 'creerDemo']);
    Route::get('/verifier/{structureId}', [LicenseController::class, 'verifier']);
    Route::get('/structure/{structureId}', [LicenseController::class, 'parStructure']);
    Route::get('/{id}', [LicenseController::class, 'show'])->where('id', '\d+');
});

// Routes admin uniquement
Route::prefix('licenses')->middleware(['auth:api', 'active', 'role:admin'])->group(function () {
    Route::post('/', [LicenseController::class, 'store'])->middleware('permission:admin.users');
    Route::post('/{id}/renouveler', [LicenseController::class, 'renouveler'])->middleware('permission:admin.users');
    Route::patch('/{id}/suspendre', [LicenseController::class, 'suspendre'])->middleware('permission:admin.users');
    Route::get('/statistiques', [LicenseController::class, 'statistiques'])->middleware('permission:admin.dashboard');
});
