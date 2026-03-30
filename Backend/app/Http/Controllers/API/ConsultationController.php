<?php

namespace App\Http\Controllers\API;

use App\Events\ConsultationEnded;
use App\Events\ConsultationStarted;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConsultationRequest;
use App\Http\Resources\ConsultationResource;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\PatientConsent;
use App\Models\RendezVous;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Consultation::with(['user', 'dossierPatient.patient', 'rendezVous']);

        if (!$request->user()->hasRole('admin')) {
            $query->where('user_id', $request->user()->id);
        }

        if ($status = $request->input('status')) {
            $statusMap = [
                'in_progress' => 'en_cours',
                'completed' => 'terminee',
                'pending' => 'planifiee',
            ];
            $query->where('statut', $statusMap[$status] ?? $status);
        }

        $consultations = $query->orderBy('date', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => ConsultationResource::collection($consultations),
            'meta' => [
                'pagination' => [
                    'current_page' => $consultations->currentPage(),
                    'last_page' => $consultations->lastPage(),
                    'per_page' => $consultations->perPage(),
                    'total' => $consultations->total(),
                ],
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $consultation = Consultation::with([
            'user', 'dossierPatient.patient', 'rendezVous.patient', 'rendezVous.user',
            'diagnostics', 'prescriptions', 'examens', 'traitements',
        ])->findOrFail($id);

        $this->authorizeAccess($consultation, request()->user());

        return response()->json([
            'success' => true,
            'data' => new ConsultationResource($consultation),
        ]);
    }

    public function startFromAppointment(int $appointmentId, Request $request): JsonResponse
    {
        $rdv = RendezVous::with('patient.dossier')->findOrFail($appointmentId);

        $dossier = $rdv->patient->dossier;
        if (!$dossier) {
            $dossier = DossierPatient::create([
                'identifiant' => 'DOS-' . str_pad($rdv->patient_id, 6, '0', STR_PAD_LEFT),
                'statut' => 'ouvert',
                'date_ouverture' => now(),
                'patient_id' => $rdv->patient_id,
            ]);
        }

        $consultation = Consultation::create([
            'motif_principal' => $rdv->motif ?? $request->input('motif_principal'),
            'date' => now(),
            'statut' => 'en_cours',
            'type' => $rdv->type === 'presentiel' ? 'presentiel' : 'teleconsultation',
            'type_suivi' => $request->input('type_suivi', 'initial'),
            'dossier_patient_id' => $dossier->id,
            'rendez_vous_id' => $rdv->id,
            'user_id' => $request->user()->id,
        ]);

        // Generate a unique room name for Jitsi only for teleconsultation
        if ($rdv->type !== 'presentiel' && !$rdv->room_name) {
            $rdv->update(['room_name' => 'tlm-' . $rdv->id . '-' . bin2hex(random_bytes(4))]);
        }

        $rdv->update(['statut' => 'en_cours']);
        $dossier->increment('nb_consultations');
        $dossier->update(['date_derniere_consultation' => now()]);

        ConsultationStarted::dispatch($consultation);

        return response()->json([
            'success' => true,
            'message' => 'Consultation démarrée',
            'data' => new ConsultationResource($consultation->load(['user', 'dossierPatient.patient', 'rendezVous'])),
        ], 201);
    }

    public function end(int $id): JsonResponse
    {
        $consultation = Consultation::findOrFail($id);
        $this->authorizeAccess($consultation, request()->user());
        $consultation->update(['statut' => 'terminee']);

        if ($consultation->rendez_vous_id) {
            RendezVous::where('id', $consultation->rendez_vous_id)
                ->update(['statut' => 'termine']);
        }

        ConsultationEnded::dispatch($consultation);

        return response()->json([
            'success' => true,
            'message' => 'Consultation terminée',
            'data' => new ConsultationResource($consultation->fresh()->load(['diagnostics', 'prescriptions', 'rendezVous', 'user'])),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth();

        // ── Statistiques de base ──
        $totalConsultations = Consultation::where('user_id', $user->id)->count();
        $completedConsultations = Consultation::where('user_id', $user->id)->where('statut', 'terminee')->count();
        $totalAppointments = RendezVous::where('user_id', $user->id)->count();
        $noShowCount = RendezVous::where('user_id', $user->id)->where('statut', 'absent')->count();

        $stats = [
            'today_consultations' => Consultation::where('user_id', $user->id)
                ->whereDate('date', $today)->count(),
            'this_month' => Consultation::where('user_id', $user->id)
                ->where('date', '>=', $monthStart)->count(),
            'total_consultations' => $totalConsultations,
            'signed_reports' => $completedConsultations,
            'pending_appointments' => RendezVous::where('user_id', $user->id)
                ->where('statut', 'confirme')->count(),
            'today_appointments' => RendezVous::where('user_id', $user->id)
                ->whereDate('date', $today)->count(),
        ];

        // ── Indicateurs sanitaires classiques ──
        $uniquePatients = RendezVous::where('user_id', $user->id)
            ->distinct('patient_id')->count('patient_id');
        $urgentConsultations = RendezVous::where('user_id', $user->id)
            ->where('priorite', 'urgent')->count();
        $prescriptionsCount = \App\Models\Prescription::whereHas('consultation', fn ($q) =>
            $q->where('user_id', $user->id)
        )->count();
        $prescriptionsSigned = \App\Models\Prescription::whereHas('consultation', fn ($q) =>
            $q->where('user_id', $user->id)
        )->where('signee', true)->count();
        $diagnosticsCount = \App\Models\Diagnostic::whereHas('consultation', fn ($q) =>
            $q->where('user_id', $user->id)
        )->count();
        $examensCount = \App\Models\Examen::whereHas('consultation', fn ($q) =>
            $q->where('user_id', $user->id)
        )->count();

        $healthIndicators = [
            'unique_patients' => $uniquePatients,
            'completion_rate' => $totalConsultations > 0
                ? round(($completedConsultations / $totalConsultations) * 100, 1) : 0,
            'no_show_rate' => $totalAppointments > 0
                ? round(($noShowCount / $totalAppointments) * 100, 1) : 0,
            'urgent_rate' => $totalAppointments > 0
                ? round(($urgentConsultations / $totalAppointments) * 100, 1) : 0,
            'prescriptions_count' => $prescriptionsCount,
            'prescriptions_signed' => $prescriptionsSigned,
            'e_prescription_rate' => $prescriptionsCount > 0
                ? round(($prescriptionsSigned / $prescriptionsCount) * 100, 1) : 0,
            'diagnostics_count' => $diagnosticsCount,
            'examens_requested' => $examensCount,
            'avg_prescriptions_per_consultation' => $completedConsultations > 0
                ? round($prescriptionsCount / $completedConsultations, 1) : 0,
        ];

        // ── Indicateurs e-santé ──
        $teleexpertiseSent = \App\Models\Teleexpertise::where('demandeur_id', $user->id)->count();
        $teleexpertiseReceived = \App\Models\Teleexpertise::where('expert_id', $user->id)->count();
        $teleexpertiseAnswered = \App\Models\Teleexpertise::where('expert_id', $user->id)
            ->where('statut', 'repondu')->count();
        $documentsShared = \App\Models\Document::where('user_id', $user->id)->count();

        $eHealthIndicators = [
            'teleexpertise_sent' => $teleexpertiseSent,
            'teleexpertise_received' => $teleexpertiseReceived,
            'teleexpertise_answered' => $teleexpertiseAnswered,
            'teleexpertise_response_rate' => $teleexpertiseReceived > 0
                ? round(($teleexpertiseAnswered / $teleexpertiseReceived) * 100, 1) : 0,
            'documents_shared' => $documentsShared,
        ];

        $upcoming = RendezVous::with('patient')
            ->where('user_id', $user->id)
            ->whereIn('statut', ['planifie', 'confirme'])
            ->where('date', '>=', $today)
            ->orderBy('date')->orderBy('heure')
            ->limit(5)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'health_indicators' => $healthIndicators,
                'ehealth_indicators' => $eHealthIndicators,
                'upcoming_appointments' => $upcoming,
            ],
        ]);
    }

    public function createReport(int $id, Request $request): JsonResponse
    {
        $consultation = Consultation::findOrFail($id);
        $this->authorizeAccess($consultation, $request->user());

        $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'follow_up_instructions' => 'nullable|string',
            'structured_data' => 'nullable|array',
        ]);

        // Persist report as JSON in observation field
        $reportData = [
            'title' => $request->input('title'),
            'content' => $request->input('content'),
            'follow_up_instructions' => $request->input('follow_up_instructions'),
            'structured_data' => $request->input('structured_data', []),
            'updated_at' => now()->toISOString(),
        ];

        $consultation->update(['observation' => json_encode($reportData)]);

        return response()->json([
            'success' => true,
            'message' => 'Rapport créé',
            'data' => new ConsultationResource(
                $consultation->fresh()->load(['diagnostics', 'prescriptions', 'examens', 'user', 'dossierPatient.patient', 'rendezVous'])
            ),
        ]);
    }

    /**
     * Signer électroniquement le rapport de consultation.
     */
    public function signReport(int $id, Request $request): JsonResponse
    {
        $consultation = Consultation::findOrFail($id);
        $this->authorizeAccess($consultation, $request->user());

        if (!$consultation->observation) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun rapport à signer. Veuillez d\'abord créer le rapport.',
            ], 422);
        }

        $reportData = json_decode($consultation->observation, true) ?? [];
        $reportData['signed'] = true;
        $reportData['signed_at'] = now()->toISOString();
        $reportData['signed_by'] = $request->user()->id;

        $consultation->update(['observation' => json_encode($reportData)]);

        return response()->json([
            'success' => true,
            'message' => 'Rapport signé électroniquement',
            'data' => new ConsultationResource(
                $consultation->fresh()->load(['diagnostics', 'prescriptions', 'examens', 'user', 'dossierPatient.patient', 'rendezVous'])
            ),
        ]);
    }

    /**
     * Partager le rapport de consultation avec le patient.
     */
    public function shareReport(int $id, Request $request): JsonResponse
    {
        $consultation = Consultation::with('dossierPatient.patient.user')->findOrFail($id);
        $this->authorizeAccess($consultation, $request->user());

        if (!$consultation->observation) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun rapport à partager.',
            ], 422);
        }

        $reportData = json_decode($consultation->observation, true) ?? [];
        $reportData['shared'] = true;
        $reportData['shared_at'] = now()->toISOString();
        $reportData['shared_with'] = array_unique(array_merge(
            $reportData['shared_with'] ?? [],
            ['patient']
        ));

        $consultation->update(['observation' => json_encode($reportData)]);

        // Notifier le patient s'il a un compte utilisateur
        $patient = $consultation->dossierPatient?->patient;
        if ($patient?->user) {
            $patient->user->notify(new \App\Notifications\ReportSharedNotification($consultation));
        }

        return response()->json([
            'success' => true,
            'message' => 'Rapport partagé avec le patient',
            'data' => new ConsultationResource(
                $consultation->fresh()->load(['diagnostics', 'prescriptions', 'examens', 'user', 'dossierPatient.patient', 'rendezVous'])
            ),
        ]);
    }

    /**
     * Enregistrer le consentement du patient pour la consultation.
     */
    public function consent(int $id, Request $request): JsonResponse
    {
        $consultation = Consultation::with('dossierPatient.patient')->findOrFail($id);

        $request->validate([
            'accepted' => 'required|boolean',
            'type' => 'nullable|string|in:teleconsultation,donnees_medicales,partage_dossier',
            'is_proxy' => ['nullable', 'boolean'],
            'proxy_nom' => ['required_if:is_proxy,true', 'nullable', 'string', 'max:255'],
            'proxy_lien' => ['required_if:is_proxy,true', 'nullable', 'string', 'max:255'],
            'proxy_piece_identite' => ['nullable', 'string', 'max:255'],
        ]);

        $consentType = $request->input('type', 'teleconsultation');
        $patientId = $consultation->dossierPatient->patient_id;

        // Enregistrer le consentement formel dans la table dédiée
        $consent = PatientConsent::create([
            'type' => $consentType,
            'version' => (PatientConsent::forPatient($patientId)->ofType($consentType)->max('version') ?? 0) + 1,
            'texte_consentement' => $this->getConsentText($consentType),
            'accepted' => $request->boolean('accepted'),
            'accepted_at' => $request->boolean('accepted') ? now() : null,
            'patient_id' => $patientId,
            'user_id' => $request->user()->id,
            'consultation_id' => $consultation->id,
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

        // Conserver aussi dans observation pour rétrocompatibilité
        $reportData = json_decode($consultation->observation, true) ?? [];
        $reportData['consent'] = [
            'accepted' => true,
            'type' => $consentType,
            'accepted_at' => now()->toISOString(),
            'accepted_by' => $request->user()->id,
            'consent_id' => $consent->id,
            'version' => $consent->version,
        ];
        $consultation->update(['observation' => json_encode($reportData)]);

        return response()->json([
            'success' => true,
            'message' => 'Consentement enregistré (version ' . $consent->version . ').',
            'data' => new ConsultationResource($consultation->fresh()->load(['user', 'dossierPatient.patient'])),
        ]);
    }

    private function getConsentText(string $type): string
    {
        return match ($type) {
            'teleconsultation' => 'Je consens à la réalisation d\'une téléconsultation et accepte que mes données médicales soient transmises de manière sécurisée au professionnel de santé.',
            'donnees_medicales' => 'Je consens au traitement de mes données médicales dans le cadre de ma prise en charge, conformément à la réglementation en vigueur.',
            'partage_dossier' => 'Je consens au partage de mon dossier médical avec le professionnel de santé désigné pour les besoins de ma prise en charge.',
            default => 'Consentement éclairé du patient conformément aux dispositions réglementaires en vigueur au Burkina Faso.',
        };
    }

    private function authorizeAccess(Consultation $consultation, $user): void
    {
        if ($user->hasRole('admin')) return;
        if ($consultation->user_id === $user->id) return;
        abort(403, 'Accès non autorisé à cette consultation.');
    }

    /**
     * Enregistrer les paramètres vitaux pendant une consultation.
     */
    public function medicalParameters(int $id, Request $request): JsonResponse
    {
        $consultation = Consultation::with('dossierPatient')->findOrFail($id);
        $this->authorizeAccess($consultation, $request->user());

        $request->validate([
            'poids'                 => 'nullable|numeric|min:0|max:500',
            'taille'                => 'nullable|numeric|min:0|max:300',
            'temperature'           => 'nullable|numeric|min:30|max:45',
            'tension_systolique'    => 'nullable|integer|min:50|max:300',
            'tension_diastolique'   => 'nullable|integer|min:30|max:200',
            'frequence_cardiaque'   => 'nullable|integer|min:20|max:250',
            'frequence_respiratoire'=> 'nullable|integer|min:5|max:80',
            'saturation_o2'         => 'nullable|integer|min:50|max:100',
            'glycemie'              => 'nullable|numeric|min:0|max:10',
        ]);

        $data = $request->only([
            'poids', 'taille', 'temperature',
            'tension_systolique', 'tension_diastolique',
            'frequence_cardiaque', 'frequence_respiratoire',
            'saturation_o2', 'glycemie',
        ]);

        // Calcul IMC
        if (!empty($data['poids']) && !empty($data['taille']) && $data['taille'] > 0) {
            $tailleMetre = $data['taille'] / 100;
            $data['imc'] = round($data['poids'] / ($tailleMetre * $tailleMetre), 1);
        }

        $data['dossier_patient_id'] = $consultation->dossier_patient_id;
        $data['user_id'] = $request->user()->id;
        $data['consultation_id'] = $consultation->id;

        $constante = \App\Models\Constante::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Constantes vitales enregistrées',
            'data' => $constante,
        ], 201);
    }

    /**
     * Télécharger le rapport de consultation en PDF.
     */
    public function downloadReport(Request $request, int $id)
    {
        $consultation = Consultation::with(['user', 'dossierPatient.patient', 'diagnostics', 'prescriptions', 'examens', 'traitements'])
            ->findOrFail($id);

        $this->authorizeAccess($consultation, $request->user());

        $report = json_decode($consultation->observation, true) ?? [];
        $structured = $report['structured_data'] ?? [];
        $patient = $consultation->dossierPatient?->patient;

        $pdf = Pdf::loadView('pdf.consultation_report', compact('consultation', 'report', 'structured', 'patient'));

        return $pdf->download("rapport-consultation-{$consultation->id}.pdf");
    }

    /**
     * Télécharger l'ordonnance en PDF.
     */
    public function downloadPrescription(Request $request, int $id)
    {
        $consultation = Consultation::with(['user', 'dossierPatient.patient', 'prescriptions'])
            ->findOrFail($id);

        $this->authorizeAccess($consultation, $request->user());

        $doctor = $consultation->user;
        $patient = $consultation->dossierPatient?->patient;
        $prescriptions = $consultation->prescriptions;

        $pdf = Pdf::loadView('pdf.prescription', compact('consultation', 'doctor', 'patient', 'prescriptions'));

        return $pdf->download("ordonnance-{$consultation->id}.pdf");
    }

    /**
     * Évaluer la qualité vidéo d'une téléconsultation.
     */
    public function rateVideoQuality(Request $request, int $id): JsonResponse
    {
        $consultation = Consultation::findOrFail($id);

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500',
        ]);

        $consultation->update([
            'video_rating' => $validated['rating'],
            'video_rating_comment' => $validated['comment'] ?? null,
            'video_rated_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Évaluation enregistrée',
        ]);
    }
}
