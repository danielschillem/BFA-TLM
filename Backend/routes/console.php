<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Rappels de rendez-vous : tous les jours à 18h
Schedule::command('appointments:send-reminders')->dailyAt('18:00');

// Nettoyer les tokens de réinitialisation de mot de passe expirés : tous les jours à 3h
Schedule::command('auth:clear-resets')->dailyAt('03:00');
