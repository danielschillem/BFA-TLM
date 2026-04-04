<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Disponibilite;
use App\Models\Structure;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectoryController extends Controller
{
    /**
     * Lister les structures de santé actives et disponibles.
     */
    public function structures(Request $request): JsonResponse
    {
        $query = Structure::with(['typeStructure', 'localite', 'services'])
            ->where('actif', true);

        if ($search = $request->input('search')) {
            $query->where('libelle', 'like', "%{$search}%");
        }

        if ($typeId = $request->input('type_structure_id')) {
            $query->where('type_structure_id', $typeId);
        }

        if ($localiteId = $request->input('localite_id')) {
            $query->where('localite_id', $localiteId);
        }

        $structures = $query->orderBy('libelle')
            ->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json([
            'success' => true,
            'data' => $structures->map(fn ($s) => [
                'id' => $s->id,
                'code_structure' => $s->code_structure,
                'libelle' => $s->libelle,
                'telephone' => $s->telephone,
                'email' => $s->email,
                'type_structure' => $s->typeStructure?->libelle,
                'localite' => $s->localite ? [
                    'commune' => $s->localite->commune,
                    'province' => $s->localite->province,
                    'region' => $s->localite->region,
                ] : null,
                'services' => $s->services->map(fn ($svc) => [
                    'id' => $svc->id,
                    'libelle' => $svc->libelle,
                ]),
                'doctors_count' => $s->users()->role(['doctor', 'specialist'])->where('status', 'actif')->count(),
            ]),
            'meta' => [
                'pagination' => [
                    'current_page' => $structures->currentPage(),
                    'last_page' => $structures->lastPage(),
                    'per_page' => $structures->perPage(),
                    'total' => $structures->total(),
                ],
            ],
        ]);
    }

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

        if ($structureId = $request->input('structure_id')) {
            $query->where('structure_id', $structureId);
        }

        if ($serviceId = $request->input('service_id')) {
            $query->where('service_id', $serviceId);
        }

        $doctors = $query->where('status', 'actif')
            ->paginate(min((int) $request->input('per_page', 15), 100));

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

        // Récupérer les disponibilités du médecin pour cette date
        $disponibilites = Disponibilite::forDoctorOnDate((int) $doctorId, $date)->get();

        // Générer les créneaux à partir des plages de disponibilité
        $allSlots = [];
        $tarif = 0;
        $typeConsultation = 'both';
        foreach ($disponibilites as $dispo) {
            foreach ($dispo->generateSlots() as $time) {
                $allSlots[$time] = true;
            }
            // Prendre le tarif le plus élevé parmi les disponibilités
            if ($dispo->tarif > $tarif) {
                $tarif = (float) $dispo->tarif;
            }
            $typeConsultation = $dispo->type_consultation;
        }

        // Si aucune disponibilité configurée → fallback créneaux standard
        if (empty($allSlots)) {
            $defaultSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
                '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
            foreach ($defaultSlots as $s) {
                $allSlots[$s] = true;
            }
        }

        ksort($allSlots);

        // Exclure les RDV déjà pris
        $bookedTimes = \App\Models\RendezVous::where('user_id', $doctorId)
            ->whereDate('date', $date)
            ->whereNotIn('statut', ['annule'])
            ->pluck('heure')
            ->map(fn ($h) => substr($h, 0, 5))
            ->toArray();

        $slots = collect(array_keys($allSlots))->map(fn ($time) => [
            'time' => $time,
            'available' => !in_array($time, $bookedTimes),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'doctor_id' => (int) $doctorId,
                'tarif' => $tarif,
                'type_consultation' => $typeConsultation,
                'slots' => $slots->values(),
                'total_available' => $slots->where('available', true)->count(),
            ],
        ]);
    }

    /**
     * Disponibilités multi-dates pour un médecin (prochains N jours).
     */
    public function getAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => 'required|exists:users,id',
            'days' => 'nullable|integer|min:1|max:30',
        ]);

        $doctorId = (int) $request->input('doctor_id');
        $days = (int) $request->input('days', 14);

        $result = [];
        $today = now();
        for ($i = 0; $i < $days; $i++) {
            $date = $today->copy()->addDays($i)->toDateString();
            $dayOfWeek = (int) $today->copy()->addDays($i)->dayOfWeek;

            $dispos = Disponibilite::forDoctorOnDate($doctorId, $date)->get();
            if ($dispos->isEmpty()) continue;

            $allSlots = [];
            $tarif = 0;
            $type = 'both';
            foreach ($dispos as $d) {
                foreach ($d->generateSlots() as $time) {
                    $allSlots[$time] = true;
                }
                if ($d->tarif > $tarif) $tarif = (float) $d->tarif;
                $type = $d->type_consultation;
            }

            $booked = \App\Models\RendezVous::where('user_id', $doctorId)
                ->whereDate('date', $date)
                ->whereNotIn('statut', ['annule'])
                ->pluck('heure')
                ->map(fn ($h) => substr($h, 0, 5))
                ->toArray();

            ksort($allSlots);
            $availableSlots = collect(array_keys($allSlots))
                ->filter(fn ($t) => !in_array($t, $booked))
                ->values();

            if ($availableSlots->isNotEmpty()) {
                $result[] = [
                    'date' => $date,
                    'day_label' => ucfirst($today->copy()->addDays($i)->translatedFormat('l d M')),
                    'tarif' => $tarif,
                    'type_consultation' => $type,
                    'available_count' => $availableSlots->count(),
                    'slots' => $availableSlots,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Récupère les disponibilités (plages horaires) du médecin connecté.
     */
    public function mySchedule(Request $request): JsonResponse
    {
        $disponibilites = Disponibilite::where('user_id', $request->user()->id)
            ->where('actif', true)
            ->orderBy('date_specifique')
            ->orderBy('jour_semaine')
            ->orderBy('heure_debut')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'jour_semaine' => $d->jour_semaine,
                'date' => $d->date_specifique?->toDateString(),
                'start_time' => substr($d->heure_debut, 0, 5),
                'end_time' => substr($d->heure_fin, 0, 5),
                'type' => $d->type_consultation,
                'duree_creneau' => $d->duree_creneau,
                'tarif' => (float) $d->tarif,
            ]);

        // Aussi renvoyer les prochains RDV
        $appointments = \App\Models\RendezVous::with('patient')
            ->where('user_id', $request->user()->id)
            ->whereIn('statut', ['planifie', 'confirme'])
            ->where('date', '>=', now()->toDateString())
            ->orderBy('date')->orderBy('heure')
            ->limit(20)
            ->get()
            ->map(fn ($rdv) => [
                'id' => $rdv->id,
                'date' => $rdv->date->toDateString(),
                'time' => substr($rdv->heure, 0, 5),
                'type' => $rdv->type,
                'status' => $rdv->statut,
                'patient' => $rdv->patient ? [
                    'id' => $rdv->patient->id,
                    'name' => trim($rdv->patient->prenoms . ' ' . $rdv->patient->nom),
                ] : null,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'disponibilites' => $disponibilites,
                'appointments' => $appointments,
            ],
        ]);
    }

    /**
     * Créer une plage de disponibilité.
     */
    public function createSchedule(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'nullable|date|after_or_equal:today',
            'jour_semaine' => 'nullable|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'type' => 'nullable|string|in:teleconsultation,presentiel,both',
            'duree_creneau' => 'nullable|integer|min:10|max:120',
            'tarif' => 'nullable|numeric|min:0',
        ]);

        // Au moins une date ou un jour de semaine
        if (!$request->input('date') && $request->input('jour_semaine') === null) {
            return response()->json([
                'success' => false,
                'message' => 'Précisez une date spécifique ou un jour de la semaine pour la récurrence.',
            ], 422);
        }

        $dispo = Disponibilite::create([
            'user_id' => $request->user()->id,
            'date_specifique' => $request->input('date'),
            'jour_semaine' => $request->input('jour_semaine'),
            'heure_debut' => $request->input('start_time'),
            'heure_fin' => $request->input('end_time'),
            'type_consultation' => $request->input('type', 'both'),
            'duree_creneau' => $request->input('duree_creneau', 30),
            'tarif' => $request->input('tarif', 0),
            'structure_id' => $request->user()->structure_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Disponibilité créée',
            'data' => [
                'id' => $dispo->id,
                'date' => $dispo->date_specifique?->toDateString(),
                'jour_semaine' => $dispo->jour_semaine,
                'start_time' => substr($dispo->heure_debut, 0, 5),
                'end_time' => substr($dispo->heure_fin, 0, 5),
                'type' => $dispo->type_consultation,
                'duree_creneau' => $dispo->duree_creneau,
                'tarif' => (float) $dispo->tarif,
            ],
        ], 201);
    }

    /**
     * Supprimer une disponibilité.
     */
    public function deleteSchedule(int $id, Request $request): JsonResponse
    {
        $dispo = Disponibilite::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $dispo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Disponibilité supprimée',
        ]);
    }
}
