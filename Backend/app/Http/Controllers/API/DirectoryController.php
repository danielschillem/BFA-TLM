<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectoryController extends Controller
{
    public function searchDoctors(Request $request): JsonResponse
    {
        $query = User::role(['doctor', 'specialist', 'health_professional'])
            ->with(['structure', 'service', 'roles']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenoms', 'like', "%{$search}%")
                  ->orWhere('specialite', 'like', "%{$search}%");
            });
        }

        if ($specialty = $request->input('specialty')) {
            $query->where('specialite', $specialty);
        }

        $doctors = $query->where('status', 'actif')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($doctors),
            'meta' => [
                'pagination' => [
                    'current_page' => $doctors->currentPage(),
                    'last_page' => $doctors->lastPage(),
                    'per_page' => $doctors->perPage(),
                    'total' => $doctors->total(),
                ],
            ],
        ]);
    }

    public function getDoctor(int $id): JsonResponse
    {
        $doctor = User::role(['doctor', 'specialist', 'health_professional'])
            ->with(['structure', 'service', 'roles'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new UserResource($doctor),
        ]);
    }

    public function getSpecialties(): JsonResponse
    {
        $specialties = User::role(['doctor', 'specialist', 'health_professional'])
            ->whereNotNull('specialite')
            ->distinct()
            ->pluck('specialite')
            ->values();

        return response()->json([
            'success' => true,
            'data' => $specialties,
        ]);
    }

    public function getSlots(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => 'required|exists:users,id',
            'date' => 'nullable|date|after_or_equal:today',
        ]);

        $doctorId = $request->input('doctor_id');
        $date = $request->input('date', now()->toDateString());

        // Créneaux de base (8h-17h par tranches de 30min)
        $allSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
            '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

        // Récupérer les RDV déjà pris pour ce médecin à cette date
        $bookedTimes = \App\Models\RendezVous::where('user_id', $doctorId)
            ->whereDate('date', $date)
            ->whereNotIn('statut', ['annule'])
            ->pluck('heure')
            ->map(fn ($h) => substr($h, 0, 5))
            ->toArray();

        $slots = collect($allSlots)->map(fn ($time) => [
            'time' => $time,
            'available' => !in_array($time, $bookedTimes),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'doctor_id' => (int) $doctorId,
                'slots' => $slots->values(),
                'total_available' => $slots->where('available', true)->count(),
            ],
        ]);
    }

    /**
     * Récupère les créneaux du médecin connecté.
     */
    public function mySchedule(Request $request): JsonResponse
    {
        $schedules = \App\Models\RendezVous::where('user_id', $request->user()->id)
            ->whereIn('statut', ['planifie', 'confirme'])
            ->where('date', '>=', now()->toDateString())
            ->orderBy('date')->orderBy('heure')
            ->get()
            ->map(fn ($rdv) => [
                'id'        => $rdv->id,
                'date'      => $rdv->date,
                'time'      => $rdv->heure,
                'type'      => $rdv->type,
                'status'    => $rdv->statut,
                'patient'   => $rdv->patient ? [
                    'id'   => $rdv->patient->id,
                    'name' => trim($rdv->patient->prenoms . ' ' . $rdv->patient->nom),
                ] : null,
            ]);

        return response()->json([
            'success' => true,
            'data' => $schedules,
        ]);
    }

    /**
     * Créer un créneau de disponibilité (slot bloqué).
     */
    public function createSchedule(Request $request): JsonResponse
    {
        $request->validate([
            'date'      => 'required|date|after_or_equal:today',
            'time'      => 'required|string',
            'type'      => 'nullable|string|in:teleconsultation,presentiel',
            'recurring' => 'nullable|boolean',
        ]);

        $rdv = \App\Models\RendezVous::create([
            'date'       => $request->input('date'),
            'heure'      => $request->input('time'),
            'type'       => $request->input('type', 'presentiel'),
            'statut'     => 'planifie',
            'user_id'    => $request->user()->id,
            'motif'      => 'Créneau disponible',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Créneau créé',
            'data' => [
                'id'   => $rdv->id,
                'date' => $rdv->date,
                'time' => $rdv->heure,
                'type' => $rdv->type,
            ],
        ], 201);
    }

    /**
     * Supprimer un créneau.
     */
    public function deleteSchedule(int $id, Request $request): JsonResponse
    {
        $rdv = \App\Models\RendezVous::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $rdv->delete();

        return response()->json([
            'success' => true,
            'message' => 'Créneau supprimé',
        ]);
    }
}
