<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Models\DossierPatient;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Document::with('user');
        $user = $request->user();

        if ($user->hasRole('admin')) {
            // Admin voit tout
        } elseif ($user->hasRole('patient')) {
            // Le patient ne voit que ses propres documents (liés à son dossier ou uploadés par lui)
            $patient = $user->patient;
            $query->where(function ($q) use ($user, $patient) {
                $q->where('user_id', $user->id);
                if ($patient) {
                    $q->orWhere(function ($q2) use ($patient) {
                        $q2->where('documentable_type', 'App\\Models\\Patient')
                           ->where('documentable_id', $patient->id);
                    });
                    if ($patient->dossier) {
                        $q->orWhere(function ($q2) use ($patient) {
                            $q2->where('documentable_type', 'App\\Models\\DossierPatient')
                               ->where('documentable_id', $patient->dossier->id);
                        });
                    }
                }
            });
        } else {
            $query->where('user_id', $user->id);
        }

        $documents = $query->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->input('per_page', 15), 100));

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
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,gif,doc,docx,xls,xlsx,rtf,odt,ods,dicom,dcm',
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
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

        return response()->download(
            Storage::disk('local')->path($document->chemin_fichier),
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

    private function authorizeAccess(Document $document, User $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ($document->user_id === $user->id) {
            return;
        }

        // Patient may access documents linked to their own patient record or dossier.
        if ($user->hasRole('patient') && $this->canPatientAccessLinkedDocument($document, $user)) {
            return;
        }

        abort(403, 'Accès non autorisé à ce document.');
    }

    private function canPatientAccessLinkedDocument(Document $document, User $user): bool
    {
        $patient = $user->patient;
        if (!$patient) {
            return false;
        }

        if ($document->documentable_type === Patient::class && (int) $document->documentable_id === (int) $patient->id) {
            return true;
        }

        if ($document->documentable_type === DossierPatient::class && $patient->dossier
            && (int) $document->documentable_id === (int) $patient->dossier->id) {
            return true;
        }

        return false;
    }
}
