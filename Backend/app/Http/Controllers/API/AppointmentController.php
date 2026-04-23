<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRendezVousRequest;
use App\Http\Resources\AppointmentResource;
use App\Events\AppointmentConfirmed;
use App\Events\AppointmentCreated;
use App\Events\AppointmentRejected;
use App\Events\AppointmentRescheduled;
use App\Notifications\AppointmentCreatedNotification;
use App\Notifications\AppointmentRejectedNotification;
use App\Notifications\AppointmentRescheduledNotification;
use App\Models\PatientConsent;
use App\Models\RendezVous;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RendezVous::with(['patient.dossier', 'user', 'structure', 'actes', 'invites']);
        $user = $request->user();

        if ($user->hasRole('patient')) {
            $patient = $user->patient;
            if ($patient) {
                $query->where('patient_id', $patient->id);
            } else {
                // Pas de fiche patient liée → aucun RDV à montrer
                $query->whereRaw('1 = 0');
            }
        } elseif (!$user->hasRole('admin')) {
            // Le PS voit ses propres RDV + ceux où il est assistant invité
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereHas('invites', fn ($i) => $i->where('users.id', $user->id));
            });
        }

        if ($status = $request->input('status')) {
            $statusMap = [
                'pending' => 'planifie',
                'confirmed' => 'confirme',
                'cancelled' => 'annule',
                'in_progress' => 'en_cours',
                'completed' => 'termine',
            ];
            $query->where('statut', $statusMap[$status] ?? $status);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->where('date', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->where('date', '<=', $dateTo);
        }

        $appointments = $query->orderBy('date', 'desc')
            ->orderBy('heure', 'desc')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json([
            'success' => true,
            'data' => AppointmentResource::collection($appointments),
            'meta' => [
                'pagination' => [
                    'current_page' => $appointments->currentPage(),
                    'last_page' => $appointments->lastPage(),
                    'per_page' => $appointments->perPage(),
                    'total' => $appointments->total(),
                ],
            ],
        ]);
    }

    public function store(StoreRendezVousRequest $request): JsonResponse
    {
        $data = $request->validated();
        $acteIds = $data['acte_ids'] ?? [];
        $assistantIds = $data['assistant_user_ids'] ?? [];
        unset($data['acte_ids'], $data['assistant_user_ids']);

        $user = $request->user();

        $rdv = DB::transaction(function () use ($user, $data, $acteIds, $assistantIds) {
            // Si le patient prend lui-même rendez-vous, lier automatiquement à sa fiche patient
            if ($user->hasRole('patient')) {
                $patient = $user->patient;

                // Auto-créer la fiche Patient si elle n'existe pas
                if (!$patient) {
                    $patient = \App\Models\Patient::create([
                        'user_id' => $user->id,
                        'nom' => $user->nom ?? 'Inconnu',
                        'prenoms' => $user->prenoms ?? 'Patient',
                        'date_naissance' => $user->date_naissance ?? now()->subYears(30)->toDateString(),
                        'sexe' => $user->sexe ?? 'M',
                        'telephone_1' => $user->telephone_1 ?? null,
                        'email' => $user->email,
                    ]);

                    \App\Models\DossierPatient::create([
                        'patient_id' => $patient->id,
                        'date_ouverture' => now(),
                        'statut' => 'ouvert',
                    ]);
                }

                $data['patient_id'] = $patient->id;
                // user_id = le médecin choisi (envoyé par le frontend), sinon null
                $data['created_by_doctor_id'] = null;
            } else {
                // Le PS connecté est le médecin consultant principal (user_id)
                if (empty($data['user_id'])) {
                    $data['user_id'] = $user->id;
                }
                $data['created_by_doctor_id'] = $user->id;
            }

            // Default status
            $data['statut'] = 'planifie';

            $rdv = RendezVous::create($data);

            // Attach selected medical acts
            if (!empty($acteIds)) {
                $rdv->actes()->sync($acteIds);
            }

            // Attach assistant PS (invités)
            if (!empty($assistantIds)) {
                $rdv->invites()->sync($assistantIds);
            }

            return $rdv;
        });

        // Compute total cost of selected actes
        $totalCost = \App\Models\Acte::whereIn('id', $acteIds)->sum('cout');

        // Si prise de RDV par un patient autonome, notifier le médecin
        if ($user->hasRole('patient') && $rdv->user_id) {
            $doctor = $rdv->user;
            if ($doctor) {
                $doctor->notify(new AppointmentCreatedNotification($rdv));
            }
            AppointmentCreated::dispatch($rdv);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous créé',
            'data' => new AppointmentResource($rdv->load(['patient', 'user', 'actes', 'invites'])),
            'total_actes' => (float) $totalCost,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $rdv = RendezVous::with(['patient.dossier', 'user', 'structure', 'consultation', 'paiements', 'actes', 'invites'])
            ->findOrFail($id);

        $this->authorizeAccess($rdv, request()->user());

        return response()->json([
            'success' => true,
            'data' => new AppointmentResource($rdv),
        ]);
    }

    public function confirm(int $id): JsonResponse
    {
        $rdv = RendezVous::with('patient.user')->findOrFail($id);
        $this->authorizeAccess($rdv, request()->user());
        $rdv->update(['statut' => 'confirme']);

        // Dispatch event → le listener notifie le patient
        AppointmentConfirmed::dispatch($rdv);

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous confirmé',
            'data' => new AppointmentResource($rdv->fresh()->load(['patient', 'user'])),
        ]);
    }

    public function cancel(int $id, Request $request): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string']);

        $rdv = RendezVous::with('patient.user')->findOrFail($id);
        $this->authorizeAccess($rdv, $request->user());
        
        $reason = $request->input('reason');
        $rdv->update([
            'statut' => 'annule',
            'motif_annulation' => $reason,
        ]);

        // Si annulation par le médecin, notifier le patient
        $currentUser = $request->user();
        if (!$currentUser->hasRole('patient') && $rdv->patient?->user) {
            $rdv->patient->user->notify(new AppointmentRejectedNotification($rdv, $reason));
            AppointmentRejected::dispatch($rdv, $reason);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous annulé',
            'data' => new AppointmentResource($rdv->fresh()),
        ]);
    }

    /**
     * Refuser un rendez-vous (par le médecin) avec notification au patient.
     */
    public function reject(int $id, Request $request): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string|max:500']);

        $rdv = RendezVous::with('patient.user', 'user')->findOrFail($id);
        $this->authorizeAccess($rdv, $request->user());

        $reason = $request->input('reason');
        $rdv->update([
            'statut' => 'annule',
            'motif_annulation' => $reason,
        ]);

        // Notifier le patient
        if ($rdv->patient?->user) {
            $rdv->patient->user->notify(new AppointmentRejectedNotification($rdv, $reason));
        }
        AppointmentRejected::dispatch($rdv, $reason);

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous refusé',
            'data' => new AppointmentResource($rdv->fresh()->load(['patient', 'user'])),
        ]);
    }

    /**
     * Reprogrammer un rendez-vous (par le médecin) avec notification au patient.
     */
    public function reschedule(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'heure' => 'required|date_format:H:i',
            'reason' => 'nullable|string|max:500',
        ]);

        $rdv = RendezVous::with('patient.user', 'user')->findOrFail($id);
        $this->authorizeAccess($rdv, $request->user());

        $oldDate = $rdv->date?->format('d/m/Y');
        $oldTime = $rdv->heure;
        $reason = $request->input('reason');

        $rdv->update([
            'date' => $request->input('date'),
            'heure' => $request->input('heure'),
            'statut' => 'planifie', // Repasse en planifié pour reconfirmation
        ]);

        // Notifier le patient
        if ($rdv->patient?->user) {
            $rdv->patient->user->notify(new AppointmentRescheduledNotification($rdv, $oldDate, $oldTime, $reason));
        }
        AppointmentRescheduled::dispatch($rdv, $oldDate, $oldTime, $reason);

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous reprogrammé',
            'data' => new AppointmentResource($rdv->fresh()->load(['patient', 'user'])),
        ]);
    }

    public function start(int $id): JsonResponse
    {
        $rdv = RendezVous::findOrFail($id);
        $this->authorizeAccess($rdv, request()->user());
        $rdv->update(['statut' => 'en_cours']);

        return response()->json([
            'success' => true,
            'message' => 'Consultation démarrée',
            'data' => new AppointmentResource($rdv->fresh()->load(['patient', 'user'])),
        ]);
    }

    /**
     * Déléguer un rendez-vous à un autre professionnel de santé.
     */
    public function delegate(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'delegate_to' => 'required|exists:users,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $rdv = RendezVous::findOrFail($id);
        $this->authorizeAccess($rdv, $request->user());

        // Vérifier que le destinataire est un professionnel de santé
        $delegate = \App\Models\User::findOrFail($request->input('delegate_to'));
        if (!$delegate->hasAnyRole(['doctor', 'specialist', 'health_professional'])) {
            abort(422, 'Le destinataire doit être un professionnel de santé.');
        }

        $rdv->update([
            'user_id' => $request->input('delegate_to'),
            'resume' => $request->input('reason', 'Rendez-vous délégué'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous délégué',
            'data' => new AppointmentResource($rdv->fresh()->load(['patient', 'user'])),
        ]);
    }

    /**
     * Enregistrer le consentement du patient pour la téléconsultation.
     */
    public function consent(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'accepted' => 'required|boolean',
            'is_proxy' => ['nullable', 'boolean'],
            'proxy_nom' => ['required_if:is_proxy,true', 'nullable', 'string', 'max:255'],
            'proxy_lien' => ['required_if:is_proxy,true', 'nullable', 'string', 'max:255'],
            'proxy_piece_identite' => ['nullable', 'string', 'max:255'],
        ]);

        $rdv = RendezVous::with('patient')->findOrFail($id);
        $this->authorizeAccess($rdv, $request->user());

        // Enregistrer le consentement formel dans la table dédiée
        $consent = PatientConsent::create([
            'type' => 'teleconsultation',
            'version' => (PatientConsent::forPatient($rdv->patient_id)->ofType('teleconsultation')->max('version') ?? 0) + 1,
            'texte_consentement' => 'Consentement à la téléconsultation conformément aux dispositions réglementaires en vigueur au Burkina Faso.',
            'accepted' => $request->boolean('accepted'),
            'accepted_at' => $request->boolean('accepted') ? now() : null,
            'patient_id' => $rdv->patient_id,
            'user_id' => $request->user()->id,
            'rendez_vous_id' => $rdv->id,
            'is_proxy' => $request->boolean('is_proxy'),
            'proxy_nom' => $request->input('proxy_nom'),
            'proxy_lien' => $request->input('proxy_lien'),
            'proxy_piece_identite' => $request->input('proxy_piece_identite'),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        if (!$request->boolean('accepted')) {
            return response()->json([
                'success' => false,
                'message' => 'Le patient a refusé le consentement.',
            ], 422);
        }

        // Ne mettre à jour le statut que s'il est encore planifié (éviter la régression)
        if ($rdv->statut === 'planifie') {
            $rdv->update(['statut' => 'confirme']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Consentement enregistré (version ' . $consent->version . ').',
            'data' => new AppointmentResource($rdv->fresh()->load(['patient', 'user'])),
        ]);
    }

    public function end(int $id): JsonResponse
    {
        $rdv = RendezVous::findOrFail($id);
        $this->authorizeAccess($rdv, request()->user());
        $rdv->update(['statut' => 'termine']);

        return response()->json([
            'success' => true,
            'message' => 'Consultation terminée',
            'data' => new AppointmentResource($rdv->fresh()),
        ]);
    }

    public function downloadPdf(int $id)
    {
        $rdv = RendezVous::with(['patient', 'user', 'actes'])->findOrFail($id);
        $this->authorizeAccess($rdv, request()->user());

        $pdf = Pdf::loadView('pdf.appointment', compact('rdv'));

        return $pdf->download("rendez-vous-{$id}.pdf");
    }

    private function authorizeAccess(RendezVous $rdv, $user): void
    {
        if ($user->hasRole('admin')) return;
        if ($rdv->user_id === $user->id) return;
        if ($rdv->invites()->where('users.id', $user->id)->exists()) return;
        if ($user->hasRole('patient') && $rdv->patient && $rdv->patient->user_id === $user->id) return;
        abort(403, 'Accès non autorisé à ce rendez-vous.');
    }
}
