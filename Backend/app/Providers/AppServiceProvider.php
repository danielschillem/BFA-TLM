<?php

namespace App\Providers;

use App\Events\AppointmentConfirmed;
use App\Events\ConsultationEnded;
use App\Events\ConsultationStarted;
use App\Events\PrescriptionSigned;
use App\Listeners\LogConsultationStarted;
use App\Listeners\NotifyPrescriptionSigned;
use App\Listeners\SendAppointmentConfirmedNotification;
use App\Listeners\UpdateDossierOnConsultationEnd;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Support\ServiceProvider;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityScheme;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ── Contraintes globales de route ──────────────────────────────────────
        Route::pattern('id', '[0-9]+');
        Route::pattern('patientId', '[0-9]+');
        Route::pattern('consultationId', '[0-9]+');
        Route::pattern('appointmentId', '[0-9]+');
        Route::pattern('dossierId', '[0-9]+');
        Route::pattern('userId', '[0-9]+');
        Route::pattern('structureId', '[0-9]+');
        Route::pattern('serviceId', '[0-9]+');


        // ── Rate limiters ──────────────────────────────────────────────────────
        RateLimiter::for('auth', function (Request $request) {
            $emailKey = Str::lower((string) $request->input('email'));
            $ip = (string) $request->ip();

            return [
                // Global anti-bruteforce by IP.
                Limit::perMinute(20)->by("auth:ip:{$ip}"),
                // Stronger lockout per email+IP combination.
                Limit::perMinute(5)->by("auth:login:{$emailKey}|{$ip}")->response(function () {
                    return response()->json([
                        'success' => false,
                        'message' => 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
                    ], 429);
                }),
            ];
        });

        RateLimiter::for('register', fn (Request $request) =>
            Limit::perMinute(5)->by($request->ip())
        );

        RateLimiter::for('api', fn (Request $request) =>
            Limit::perMinute(120)->by($request->user()?->id ?: $request->ip())
        );

        // Limiter les tentatives de réinitialisation de mot de passe
        RateLimiter::for('password-reset', fn (Request $request) =>
            Limit::perMinute(3)->by($request->ip())
        );

        // Limiter les exports / téléchargements volumineux
        RateLimiter::for('export', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip())
        );

        // Limiter les endpoints d'interopérabilité (FHIR, CDA, terminologies)
        RateLimiter::for('interop', fn (Request $request) =>
            Limit::perMinute(60)->by($request->user()?->id ?: $request->ip())
        );

        // Limiter les endpoints sensibles (patients, dossiers, DICOM)
        RateLimiter::for('sensitive', fn (Request $request) =>
            Limit::perMinute(60)->by($request->user()?->id ?: $request->ip())
        );

        // Limiter les endpoints admin
        RateLimiter::for('admin', fn (Request $request) =>
            Limit::perMinute(30)->by($request->user()?->id ?: $request->ip())
        );

        // Monitoring frontend public: strict limits to reduce log noise/cost.
        RateLimiter::for('frontend-monitoring', function (Request $request) {
            $ua = substr((string) $request->userAgent(), 0, 120);
            return Limit::perMinute(15)->by($request->ip() . '|' . $ua);
        });

        // Visio metrics are authenticated but we still rate-limit per user/IP.
        RateLimiter::for('visio-monitoring', fn (Request $request) =>
            Limit::perMinute(60)->by($request->user()?->id ?: $request->ip())
        );

        Event::listen(AppointmentConfirmed::class, SendAppointmentConfirmedNotification::class);
        Event::listen(ConsultationStarted::class, LogConsultationStarted::class);
        Event::listen(ConsultationEnded::class, UpdateDossierOnConsultationEnd::class);
        Event::listen(PrescriptionSigned::class, NotifyPrescriptionSigned::class);

        // ── Scramble OpenAPI documentation ─────────────────────────────────────
        Scramble::resolveTagsUsing(function ($routeInfo) {
            $uri = $routeInfo->route->uri;
            $segments = explode('/', $uri);
            $prefix = $segments[2] ?? 'general';

            return match ($prefix) {
                'auth'            => ['Authentification'],
                'fhir'            => ['FHIR R4 — Interopérabilité'],
                'cda'             => ['CDA R2 — Documents cliniques'],
                'terminology'     => ['Terminologies (SNOMED CT / ATC)'],
                'icd11'           => ['ICD-11 OMS'],
                'dhis2'           => ['DHIS2 & ENDOS'],
                'dicom'           => ['DICOM — Imagerie médicale'],
                'directory'       => ['Annuaire médecins'],
                'appointments'    => ['Rendez-vous'],
                'consultations'   => ['Consultations'],
                'prescriptions'   => ['Prescriptions'],
                'patients'        => ['Patients'],
                'teleexpertise'   => ['Téléexpertise'],
                'documents'       => ['Documents'],
                'messages'        => ['Messagerie'],
                'notifications'   => ['Notifications'],
                'payments'        => ['Paiements'],
                'consents'        => ['Consentements (OMS/RGPD)'],
                'admin'           => ['Administration'],
                'gestionnaire'    => ['Gestionnaire de structure'],
                'audit'           => ['Audit & Traçabilité'],
                'certificats-deces' => ['Certificats de décès'],
                'licenses'        => ['Licences & Tarification'],
                default           => ['Référentiels'],
            };
        });

        Scramble::afterOpenApiGenerated(function (OpenApi $openApi) {
            $openApi->secure(
                SecurityScheme::http('bearer', 'JWT')
            );
        });
    }
}
