<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Liste des annonces publiées (pour tous les utilisateurs).
     */
    public function index(): JsonResponse
    {
        $announcements = Announcement::published()
            ->orderBy('date_publication', 'desc')
            ->get()
            ->map(fn ($a) => $this->format($a));

        return response()->json(['success' => true, 'data' => $announcements]);
    }

    /**
     * Liste admin (toutes les annonces, tout statut).
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Announcement::with('auteur')->orderBy('created_at', 'desc');

        if ($status = $request->input('status')) {
            $query->where('statut', $status);
        }

        $announcements = $query->get()->map(fn ($a) => $this->format($a));

        return response()->json(['success' => true, 'data' => $announcements]);
    }

    /**
     * Créer une annonce.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titre'            => 'required|string|max:255',
            'contenu'          => 'required|string',
            'type'             => 'in:info,warning,urgent,maintenance',
            'statut'           => 'in:brouillon,publie,archive',
            'date_publication' => 'nullable|date',
            'date_expiration'  => 'nullable|date|after_or_equal:date_publication',
        ]);

        $validated['auteur_id'] = auth()->id();
        $validated['statut'] = $validated['statut'] ?? 'brouillon';

        if (($validated['statut'] ?? '') === 'publie' && empty($validated['date_publication'])) {
            $validated['date_publication'] = now();
        }

        $announcement = Announcement::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Annonce créée',
            'data'    => $this->format($announcement->fresh()->load('auteur')),
        ], 201);
    }

    /**
     * Détail d'une annonce.
     */
    public function show(int $id): JsonResponse
    {
        $announcement = Announcement::with('auteur')->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->format($announcement)]);
    }

    /**
     * Mettre à jour une annonce.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $announcement = Announcement::findOrFail($id);

        $validated = $request->validate([
            'titre'            => 'sometimes|string|max:255',
            'contenu'          => 'sometimes|string',
            'type'             => 'in:info,warning,urgent,maintenance',
            'statut'           => 'in:brouillon,publie,archive',
            'date_publication' => 'nullable|date',
            'date_expiration'  => 'nullable|date',
        ]);

        if (($validated['statut'] ?? '') === 'publie' && !$announcement->date_publication && empty($validated['date_publication'])) {
            $validated['date_publication'] = now();
        }

        $announcement->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Annonce mise à jour',
            'data'    => $this->format($announcement->fresh()->load('auteur')),
        ]);
    }

    /**
     * Supprimer une annonce.
     */
    public function destroy(int $id): JsonResponse
    {
        Announcement::findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Annonce supprimée']);
    }

    /**
     * Formater une annonce pour la réponse JSON.
     */
    private function format(Announcement $a): array
    {
        return [
            'id'               => $a->id,
            'title'            => $a->titre,
            'content'          => $a->contenu,
            'type'             => $a->type,
            'status'           => $a->statut,
            'published_at'     => $a->date_publication?->toIso8601String(),
            'expires_at'       => $a->date_expiration?->toIso8601String(),
            'author'           => $a->auteur ? [
                'id'   => $a->auteur->id,
                'name' => trim($a->auteur->prenoms . ' ' . $a->auteur->nom),
            ] : null,
            'created_at'       => $a->created_at?->toIso8601String(),
            'updated_at'       => $a->updated_at?->toIso8601String(),
        ];
    }
}
