<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Document::with('user');

        if (!$request->user()->hasRole('admin')) {
            $query->where('user_id', $request->user()->id);
        }

        $documents = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => DocumentResource::collection($documents),
            'meta' => ['pagination' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'total' => $documents->total(),
            ]],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240',
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'niveau_confidentialite' => 'nullable|in:normal,confidentiel,tres_confidentiel',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'local');

        $document = Document::create([
            'titre' => $request->titre,
            'description' => $request->description,
            'chemin_fichier' => $path,
            'type_mime' => $file->getMimeType(),
            'taille_octets' => $file->getSize(),
            'niveau_confidentialite' => $request->input('niveau_confidentialite', 'normal'),
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document uploadé',
            'data' => new DocumentResource($document),
        ], 201);
    }

    public function download(int $id)
    {
        $document = Document::findOrFail($id);
        $this->authorizeAccess($document, request()->user());

        if (!Storage::disk('local')->exists($document->chemin_fichier)) {
            return response()->json(['success' => false, 'message' => 'Fichier introuvable'], 404);
        }

        return Storage::disk('local')->download(
            $document->chemin_fichier,
            $document->titre . '.' . pathinfo($document->chemin_fichier, PATHINFO_EXTENSION)
        );
    }

    public function destroy(int $id): JsonResponse
    {
        $document = Document::findOrFail($id);
        $this->authorizeAccess($document, request()->user());
        Storage::disk('local')->delete($document->chemin_fichier);
        $document->delete();

        return response()->json(['success' => true, 'message' => 'Document supprimé']);
    }

    private function authorizeAccess(Document $document, $user): void
    {
        if ($user->hasRole('admin')) return;
        if ($document->user_id === $user->id) return;
        abort(403, 'Accès non autorisé à ce document.');
    }
}
