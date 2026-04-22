<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTeleexpertiseRequest;
use App\Http\Resources\TeleexpertiseResource;
use App\Models\Teleexpertise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeleexpertiseController extends Controller
{
    private const STATUS_TO_FR = [
        'pending'  => 'en_attente',
        'accepted' => 'acceptee',
        'rejected' => 'rejetee',
        'responded'=> 'repondue',
    ];

    private const PRIORITY_TO_FR = [
        'low'    => 'normale',
        'normal' => 'normale',
        'high'   => 'haute',
        'urgent' => 'urgente',
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Teleexpertise::with(['demandeur', 'expert', 'patient']);

        if (!$user->hasRole('admin')) {
            $query->where(function ($q) use ($user) {
                $q->where('demandeur_id', $user->id)
                  ->orWhere('expert_id', $user->id);
            });
        }

        // Filtre par statut (EN → FR)
        if ($status = $request->input('status')) {
            $statusFr = self::STATUS_TO_FR[$status] ?? $status;
            $query->where('statut', $statusFr);
        }

        $items = $query->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json([
            'success' => true,
            'data' => TeleexpertiseResource::collection($items),
            'meta' => ['pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ]],
        ]);
    }

    public function store(StoreTeleexpertiseRequest $request): JsonResponse
    {
        $item = Teleexpertise::create([
            ...$request->normalizedPayload(),
            'demandeur_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Demande de téléexpertise créée',
            'data' => new TeleexpertiseResource($item->load(['demandeur', 'expert'])),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = Teleexpertise::with(['demandeur', 'expert', 'patient'])->findOrFail($id);
        $this->authorizeAccess($item, request()->user());

        return response()->json([
            'success' => true,
            'data' => new TeleexpertiseResource($item),
        ]);
    }

    public function accept(int $id): JsonResponse
    {
        $item = Teleexpertise::findOrFail($id);
        $this->authorizeExpert($item, request()->user());

        if ($item->statut !== 'en_attente') {
            return response()->json([
                'success' => false,
                'message' => 'Seule une demande en attente peut être acceptée (statut actuel : ' . $item->statut . ').',
            ], 422);
        }

        $item->update(['statut' => 'acceptee']);

        return response()->json(['success' => true, 'message' => 'Demande acceptée']);
    }

    public function reject(int $id, Request $request): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string']);
        $item = Teleexpertise::findOrFail($id);
        $this->authorizeExpert($item, $request->user());

        if ($item->statut !== 'en_attente') {
            return response()->json([
                'success' => false,
                'message' => 'Seule une demande en attente peut être rejetée (statut actuel : ' . $item->statut . ').',
            ], 422);
        }

        $item->update(['statut' => 'rejetee', 'motif_rejet' => $request->input('reason')]);

        return response()->json(['success' => true, 'message' => 'Demande rejetée']);
    }

    public function respond(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'response'           => 'required|string',
            'recommendations'    => 'nullable|string',
            'follow_up_required' => 'nullable|boolean',
        ]);
        $item = Teleexpertise::findOrFail($id);
        $this->authorizeExpert($item, $request->user());

        if (!in_array($item->statut, ['en_attente', 'acceptee'])) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de répondre à une demande ' . $item->statut . '.',
            ], 422);
        }

        $item->update([
            'statut'          => 'repondue',
            'reponse'         => $request->input('response'),
            'recommandations' => $request->input('recommendations'),
            'suivi_requis'    => $request->boolean('follow_up_required'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Réponse envoyée',
            'data' => new TeleexpertiseResource($item->fresh()->load(['demandeur', 'expert'])),
        ]);
    }

    private function authorizeAccess(Teleexpertise $item, $user): void
    {
        if ($user->hasRole('admin')) return;
        if ($item->demandeur_id === $user->id || $item->expert_id === $user->id) return;
        abort(403, 'Accès non autorisé à cette téléexpertise.');
    }

    private function authorizeExpert(Teleexpertise $item, $user): void
    {
        if ($user->hasRole('admin')) return;
        if ($item->expert_id === $user->id) return;
        abort(403, 'Seul l\'expert désigné peut effectuer cette action.');
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $baseQuery = fn () => Teleexpertise::where('demandeur_id', $user->id)->orWhere('expert_id', $user->id);

        return response()->json([
            'success' => true,
            'data' => [
                'total'     => $baseQuery()->count(),
                'pending'   => Teleexpertise::where('expert_id', $user->id)->where('statut', 'en_attente')->count(),
                'accepted'  => Teleexpertise::where('expert_id', $user->id)->where('statut', 'acceptee')->count(),
                'responded' => Teleexpertise::where('demandeur_id', $user->id)->where('statut', 'repondue')->count(),
                'rejected'  => Teleexpertise::where('expert_id', $user->id)->where('statut', 'rejetee')->count(),
            ],
        ]);
    }
}
