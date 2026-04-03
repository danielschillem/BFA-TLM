<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Resources\PaiementResource;
use App\Models\Paiement;
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
            'amount'  => 'required|numeric|min:0',
            'method'  => 'required|string',
            'phone'   => 'nullable|string|max:20',
        ]);

        // Trouver le rendez-vous lié à la consultation
        $rdv = RendezVous::where('id', function ($q) use ($consultationId) {
            $q->select('rendez_vous_id')
              ->from('consultations')
              ->where('id', $consultationId)
              ->limit(1);
        })->first();

        if (!$rdv) {
            // Fallback : utiliser consultationId comme appointment_id direct
            $rdv = RendezVous::find($consultationId);
        }

        $paiement = Paiement::create([
            'telephone'           => $request->input('phone', $request->user()->telephone_1),
            'montant'             => $request->input('amount'),
            'methode'             => self::METHOD_MAP[$request->input('method')] ?? $request->input('method'),
            'statut'              => 'en_attente',
            'reference'           => 'PAY-' . strtoupper(Str::random(10)),
            'rendez_vous_id'      => $rdv?->id,
            'type_facturation_id' => $request->input('billing_type_id'),
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'Paiement initié',
            'data'      => new PaiementResource($paiement),
        ], 201);
    }

    /**
     * Initier un paiement directement sur un rendez-vous (booking patient).
     * POST /payments/appointments/{appointmentId}/initiate
     */
    public function initiateForAppointment(int $appointmentId, Request $request): JsonResponse
    {
        $request->validate([
            'amount'  => 'required|numeric|min:0',
            'method'  => 'required|string',
            'phone'   => 'nullable|string|max:20',
        ]);

        $rdv = RendezVous::findOrFail($appointmentId);

        // Vérifier que l'utilisateur est impliqué dans ce RDV
        $user = $request->user();
        if (!$user->hasRole('admin')
            && $rdv->user_id !== $user->id
            && (!$rdv->patient || $rdv->patient->user_id !== $user->id)) {
            abort(403, 'Accès non autorisé à ce rendez-vous.');
        }

        $paiement = Paiement::create([
            'telephone'           => $request->input('phone', $user->telephone_1),
            'montant'             => $request->input('amount'),
            'methode'             => self::METHOD_MAP[$request->input('method')] ?? $request->input('method'),
            'statut'              => 'en_attente',
            'reference'           => 'PAY-' . strtoupper(Str::random(10)),
            'rendez_vous_id'      => $rdv->id,
            'type_facturation_id' => $request->input('billing_type_id'),
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'Paiement initié',
            'data'      => new PaiementResource($paiement),
        ], 201);
    }

    /**
     * Confirmer un paiement (callback mobile money ou validation manuelle).
     * POST /payments/confirm
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'reference' => 'required|string',
            'otp_code'  => 'nullable|string',
        ]);

        $paiement = Paiement::where('reference', $request->input('reference'))->firstOrFail();

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
            ->paginate($request->input('per_page', 15));

        // Statistiques
        $totalPaid = Paiement::whereHas('rendezVous', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->where('statut', 'confirme')->sum('montant');

        return response()->json([
            'success' => true,
            'data'    => PaiementResource::collection($payments),
            'stats'   => [
                'total_paid'    => (float) $totalPaid,
                'total_pending' => (float) Paiement::whereHas('rendezVous', fn ($q) => $q->where('user_id', $user->id))->where('statut', 'en_attente')->sum('montant'),
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
