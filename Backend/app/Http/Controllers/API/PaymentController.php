<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Resources\PaiementResource;
use App\Models\Paiement;
use App\Models\PlatformSetting;
use App\Models\RendezVous;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    use AuthorizesStructureAccess;
    private const METHOD_MAP = [
        'orange_money' => 'orange_money',
        'moov_money'   => 'moov_money',
        'card'         => 'carte',
        'carte'        => 'carte',
        'cash'         => 'especes',
        'especes'      => 'especes',
    ];

    /**
     * Initier un paiement pour une consultation (via rendez-vous).
     * POST /payments/consultations/{consultationId}/initiate
     */
    public function initiate(int $consultationId, Request $request): JsonResponse
    {
        $request->validate([
            'method'  => 'required|string|in:orange_money,moov_money,card,carte,cash,especes',
            'phone'   => 'nullable|string|max:20',
        ]);

        // Trouver le rendez-vous lié à la consultation via la relation
        $consultation = \App\Models\Consultation::find($consultationId);
        $rdv = $consultation?->rendezVous;

        if (!$rdv) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun rendez-vous lié à cette consultation.',
            ], 404);
        }

        // IDOR check: vérifier que l'utilisateur est impliqué
        $user = $request->user();
        if (!$user->hasRole('admin')
            && $consultation->user_id !== $user->id
            && $rdv->user_id !== $user->id
            && (!$rdv->patient || $rdv->patient->user_id !== $user->id)) {
            abort(403, 'Accès non autorisé à cette consultation.');
        }

        // Calculer le montant côté serveur à partir des actes
        $consultationAmount = (float) $rdv->actes()->sum('cout');
        $fees = PlatformSetting::calculateTotalWithFees($consultationAmount);

        $method = self::METHOD_MAP[$request->input('method')] ?? $request->input('method');
        if ($method === 'especes') {
            $fees['mobile_money_fee'] = 0;
            $fees['total'] = $fees['consultation_amount'] + $fees['platform_fee'];
        }

        $paiement = Paiement::create([
            'telephone'           => $request->input('phone', $request->user()->telephone_1),
            'montant'             => $fees['total'],
            'montant_consultation' => $fees['consultation_amount'],
            'frais_plateforme'    => $fees['platform_fee'],
            'frais_mobile_money'  => $fees['mobile_money_fee'],
            'methode'             => $method,
            'statut'              => 'en_attente',
            'reference'           => 'PAY-' . strtoupper(Str::random(10)),
            'rendez_vous_id'      => $rdv?->id,
            'type_facturation_id' => $request->input('billing_type_id'),
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'Paiement initié',
            'data'      => new PaiementResource($paiement),
            'fees'      => $fees,
        ], 201);
    }

    /**
     * Initier un paiement directement sur un rendez-vous (booking patient).
     * POST /payments/appointments/{appointmentId}/initiate
     */
    public function initiateForAppointment(int $appointmentId, Request $request): JsonResponse
    {
        $request->validate([
            'method'              => 'required|string|in:orange_money,moov_money,card,carte,cash,especes',
            'phone'               => 'nullable|string|max:20',
        ]);

        $rdv = RendezVous::findOrFail($appointmentId);

        // Vérifier que l'utilisateur est impliqué dans ce RDV
        $user = $request->user();
        if (!$user->hasRole('admin')
            && $rdv->user_id !== $user->id
            && (!$rdv->patient || $rdv->patient->user_id !== $user->id)) {
            abort(403, 'Accès non autorisé à ce rendez-vous.');
        }

        // Calculer le montant côté serveur à partir des actes liés au RDV
        $consultationAmount = (float) $rdv->actes()->sum('cout');
        $fees = PlatformSetting::calculateTotalWithFees($consultationAmount);

        // Pour les paiements en espèces, pas de frais mobile money
        $method = self::METHOD_MAP[$request->input('method')] ?? $request->input('method');
        if ($method === 'especes') {
            $fees['mobile_money_fee'] = 0;
            $fees['total'] = $fees['consultation_amount'] + $fees['platform_fee'];
        }

        $paiement = Paiement::create([
            'telephone'           => $request->input('phone', $user->telephone_1),
            'montant'             => $fees['total'],
            'montant_consultation' => $fees['consultation_amount'],
            'frais_plateforme'    => $fees['platform_fee'],
            'frais_mobile_money'  => $fees['mobile_money_fee'],
            'methode'             => $method,
            'statut'              => 'en_attente',
            'reference'           => 'PAY-' . strtoupper(Str::random(10)),
            'rendez_vous_id'      => $rdv->id,
            'type_facturation_id' => $request->input('billing_type_id'),
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'Paiement initié',
            'data'      => new PaiementResource($paiement),
            'fees'      => $fees,
        ], 201);
    }

    /**
     * Calculer les frais pour un montant donné (preview avant paiement).
     * GET /payments/calculate-fees
     */
    public function calculateFees(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'method' => 'nullable|string',
        ]);

        $amount = (float) $request->input('amount');
        $fees = PlatformSetting::calculateTotalWithFees($amount);

        // Pour les paiements en espèces, pas de frais mobile money
        $method = $request->input('method');
        if ($method && (self::METHOD_MAP[$method] ?? $method) === 'especes') {
            $fees['mobile_money_fee'] = 0;
            $fees['total'] = $fees['consultation_amount'] + $fees['platform_fee'];
        }

        return response()->json([
            'success' => true,
            'data'    => $fees,
        ]);
    }

    /**
     * Confirmer un paiement (callback mobile money ou validation manuelle).
     * POST /payments/confirm
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'reference' => 'required|string',
            'otp_code'  => 'required|string|min:4|max:12',
        ]);

        $paiement = Paiement::with('rendezVous.patient')->where('reference', $request->input('reference'))->firstOrFail();

        $user = $request->user();
        if (!$user->hasRole('admin')) {
            abort(403, 'Seul un administrateur peut confirmer manuellement un paiement.');
        }

        if ($paiement->statut !== 'en_attente') {
            return response()->json([
                'success' => false,
                'message' => 'Ce paiement a déjà été traité.',
            ], 422);
        }

        $paiement->update([
            'statut'   => 'confirme',
            'code_otp' => $request->input('otp_code'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Paiement confirmé',
            'data'    => new PaiementResource($paiement->fresh()),
        ]);
    }

    /**
     * Validation côté médecin (marquer comme confirmé par le praticien).
     * POST /payments/{id}/doctor-validate
     */
    public function doctorValidate(int $id): JsonResponse
    {
        $paiement = Paiement::with('rendezVous')->findOrFail($id);

        // IDOR : seul le médecin du RDV ou un admin peut valider
        $user = request()->user();
        if (!$user->hasRole('admin') && $paiement->rendezVous?->user_id !== $user->id) {
            abort(403, 'Vous n\'\u00eates pas autoris\u00e9 \u00e0 valider ce paiement.');
        }

        if ($paiement->statut === 'confirme') {
            return response()->json([
                'success' => true,
                'message' => 'Paiement déjà validé',
                'data'    => new PaiementResource($paiement),
            ]);
        }

        $paiement->update(['statut' => 'confirme']);

        return response()->json([
            'success' => true,
            'message' => 'Paiement validé par le médecin',
            'data'    => new PaiementResource($paiement->fresh()),
        ]);
    }

    /**
     * Télécharger une facture (PDF placeholder).
     * GET /payments/{id}/invoice
     */
    public function downloadInvoice(int $id): \Symfony\Component\HttpFoundation\Response
    {
        $paiement = Paiement::with(['rendezVous.patient', 'rendezVous.user', 'typeFacturation'])->findOrFail($id);

        // IDOR : vérifier que l'utilisateur est impliqué
        $user = request()->user();
        if (!$user->hasRole('admin')
            && $paiement->rendezVous?->user_id !== $user->id
            && $paiement->rendezVous?->patient?->user_id !== $user->id) {
            abort(403, 'Acc\u00e8s non autoris\u00e9 \u00e0 cette facture.');
        }

        $pdf = Pdf::loadView('pdf.invoice', compact('paiement'));

        return $pdf->download("recu-{$paiement->reference}.pdf");
    }

    /**
     * Relevé de paiements de l'utilisateur connecté.
     * GET /payments/statement
     */
    public function statement(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Paiement::with(['rendezVous', 'typeFacturation'])
            ->whereHas('rendezVous', function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereHas('patient', function ($pq) use ($user) {
                      $pq->where('user_id', $user->id);
                  });
            });

        if ($from = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($status = $request->input('status')) {
            $statusMap = ['pending' => 'en_attente', 'confirmed' => 'confirme', 'failed' => 'echoue', 'refunded' => 'rembourse'];
            $query->where('statut', $statusMap[$status] ?? $status);
        }

        $payments = $query->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        // Statistiques — montant is text in DB, must cast to numeric for SUM
        $totalPaid = Paiement::whereHas('rendezVous', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->where('statut', 'confirme')
          ->selectRaw('COALESCE(SUM(CAST(montant AS NUMERIC)), 0) as total')
          ->value('total');

        $totalPending = Paiement::whereHas('rendezVous', fn ($q) => $q->where('user_id', $user->id))
            ->where('statut', 'en_attente')
            ->selectRaw('COALESCE(SUM(CAST(montant AS NUMERIC)), 0) as total')
            ->value('total');

        return response()->json([
            'success' => true,
            'data'    => PaiementResource::collection($payments),
            'stats'   => [
                'total_paid'    => (float) $totalPaid,
                'total_pending' => (float) $totalPending,
                'count'         => $payments->total(),
            ],
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page'    => $payments->lastPage(),
                'per_page'     => $payments->perPage(),
                'total'        => $payments->total(),
            ],
        ]);
    }
}
