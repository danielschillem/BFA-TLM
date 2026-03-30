<?php

use App\Models\Consultation;
use App\Models\RendezVous;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Canaux privés pour la diffusion temps réel via Laravel Reverb.
| Chaque canal vérifie que l'utilisateur authentifié a le droit d'écouter.
|
*/

// ── Canal privé utilisateur (notifications personnelles) ───────────────
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// ── Canal privé patient (rendez-vous, prescriptions) ──────────────────
Broadcast::channel('patient.{patientId}', function ($user, $patientId) {
    // Le patient lui-même (via sa fiche patient)
    $patient = \App\Models\Patient::find($patientId);
    if (!$patient) return false;

    return (int) $user->id === (int) $patient->user_id;
});

// ── Canal privé rendez-vous ────────────────────────────────────────────
Broadcast::channel('appointment.{appointmentId}', function ($user, $appointmentId) {
    $rdv = RendezVous::with('patient')->find($appointmentId);
    if (!$rdv) return false;

    // Le médecin assigné ou le patient concerné
    return (int) $user->id === (int) $rdv->user_id
        || (int) $user->id === (int) $rdv->patient?->user_id;
});

// ── Canal privé consultation (signaux temps réel pendant la consultation) ─
Broadcast::channel('consultation.{consultationId}', function ($user, $consultationId) {
    $consultation = Consultation::with('rendezVous.patient')->find($consultationId);
    if (!$consultation) return false;

    // Le médecin qui conduit la consultation ou le patient
    return (int) $user->id === (int) $consultation->user_id
        || (int) $user->id === (int) $consultation->rendezVous?->patient?->user_id;
});

// ── Canal privé messagerie (conversation entre 2 utilisateurs) ────────
Broadcast::channel('chat.{user1}.{user2}', function ($user, $user1, $user2) {
    $userId = (int) $user->id;
    return $userId === (int) $user1 || $userId === (int) $user2;
});
