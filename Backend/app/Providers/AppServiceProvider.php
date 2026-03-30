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
use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

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

        // Passport scopes
        Passport::tokensCan([
            '2fa-pending' => 'Token en attente de vérification 2FA',
        ]);

        // ── Rate limiters ──────────────────────────────────────────────────────
        RateLimiter::for('auth', fn (Request $request) =>
            Limit::perMinute(30)->by($request->ip())
        );

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

        Event::listen(AppointmentConfirmed::class, SendAppointmentConfirmedNotification::class);
        Event::listen(ConsultationStarted::class, LogConsultationStarted::class);
        Event::listen(ConsultationEnded::class, UpdateDossierOnConsultationEnd::class);
        Event::listen(PrescriptionSigned::class, NotifyPrescriptionSigned::class);
    }
}
