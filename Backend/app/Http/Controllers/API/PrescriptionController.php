<?php

namespace App\Http\Controllers\API;

use App\Events\PrescriptionSigned;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Resources\PrescriptionResource;
use App\Models\Prescription;
use App\Notifications\PrescriptionSharedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrescriptionController extends Controller
{
    use AuthorizesStructureAccess;
    public function index(Request $request): JsonResponse
    {
        $query = Prescription::with(['consultation.user', 'consultation.dossierPatient.patient']);
        $user = $request->user();

        if ($user->hasRole('admin')) {
            // Admin voit tout
        } elseif ($user->hasRole('patient')) {
            // Le patient ne voit que ses propres prescriptions (via son dossier)
            $patient = $user->patient;
            if ($patient && $patient->dossier) {
                $query->whereHas('consultation', fn ($q) => $q->where('dossier_patient_id', $patient->dossier->id));
            } else {
                $query->whereRaw('1 = 0');
            }
        } else {
            // PS voit les prescriptions de ses consultations
            $query->whereHas('consultation', fn ($q) => $q->where('user_id', $user->id));
        }

        $prescriptions = $query->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json([
            'success' => true,
            'data' => PrescriptionResource::collection($prescriptions),
        ]);
    }

    public function store(int $consultationId, Request $request): JsonResponse
    {
        $request->validate([
            'denomination' => 'required|string|max:255',
            'posologie' => 'nullable|string|max:1000',
            'instructions' => 'nullable|string|max:2000',
            'duree_jours' => 'nullable|integer|min:1|max:365',
            'urgent' => 'nullable|boolean',
        ]);

        $consultation = \App\Models\Consultation::findOrFail($consultationId);

        // Vérifier que le médecin est le propriétaire de la consultation
        $user = $request->user();
        if (!$user->hasRole('admin') && $consultation->user_id !== $user->id) {
            abort(403, 'Vous n\'\u00eates pas autoris\u00e9 \u00e0 prescrire pour cette consultation.');
        }

        $prescription = Prescription::create([
            ...$request->only(['denomination', 'posologie', 'instructions', 'duree_jours', 'urgent']),
            'consultation_id' => $consultationId,
            'dossier_patient_id' => $consultation->dossier_patient_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Prescription créée',
            'data' => new PrescriptionResource($prescription),
        ], 201);
    }

    public function sign(int $id): JsonResponse
    {
        $prescription = Prescription::with('consultation')->findOrFail($id);
        $user = request()->user();

        if (!$user->hasRole('admin') && $prescription->consultation->user_id !== $user->id) {
            abort(403, 'Seul le médecin de la consultation peut signer cette prescription.');
        }

        if ($prescription->signee) {
            return response()->json([
                'success' => false,
                'message' => 'Cette prescription est déjà signée.',
            ], 422);
        }

        $prescription->update(['signee' => true]);

        PrescriptionSigned::dispatch($prescription);

        return response()->json(['success' => true, 'message' => 'Prescription signée']);
    }

    public function share(int $id, Request $request): JsonResponse
    {
        $prescription = Prescription::with(['consultation.user', 'consultation.dossierPatient.patient.user'])->findOrFail($id);
        $user = $request->user();

        // Seul le médecin de la consultation ou un admin peut partager
        if (!$user->hasRole('admin') && $prescription->consultation->user_id !== $user->id) {
            abort(403, 'Seul le médecin de la consultation peut partager cette prescription.');
        }

        if (!$prescription->signee) {
            return response()->json([
                'success' => false,
                'message' => 'La prescription doit être signée avant d\'être partagée.',
            ], 422);
        }

        // Notifier le patient s'il a un compte utilisateur
        $patient = $prescription->consultation->dossierPatient?->patient;
        if ($patient?->user) {
            $patient->user->notify(new PrescriptionSharedNotification($prescription));
        }

        return response()->json([
            'success' => true,
            'message' => 'Prescription partagée avec le patient',
            'data' => new PrescriptionResource($prescription),
        ]);
    }
}
