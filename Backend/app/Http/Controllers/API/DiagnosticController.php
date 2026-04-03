<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Requests\StoreDiagnosticRequest;
use App\Http\Resources\DiagnosticResource;
use App\Models\Diagnostic;
use Illuminate\Http\JsonResponse;

class DiagnosticController extends Controller
{
    use AuthorizesStructureAccess;

    public function store(StoreDiagnosticRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Résoudre le dossier_patient_id depuis la consultation si absent
        if (empty($validated['dossier_patient_id']) && !empty($validated['consultation_id'])) {
            $consultation = \App\Models\Consultation::find($validated['consultation_id']);
            if ($consultation) {
                $validated['dossier_patient_id'] = $consultation->dossier_patient_id;
            }
        }

        if (!empty($validated['dossier_patient_id'])) {
            $this->authorizeDossierAccess($validated['dossier_patient_id']);
        }

        $diagnostic = Diagnostic::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Diagnostic créé',
            'data' => new DiagnosticResource($diagnostic),
        ], 201);
    }

    public function update(StoreDiagnosticRequest $request, int $id): JsonResponse
    {
        $diagnostic = Diagnostic::findOrFail($id);
        $this->authorizeDossierResource($diagnostic);
        $diagnostic->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Diagnostic mis à jour',
            'data' => new DiagnosticResource($diagnostic->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $diagnostic = Diagnostic::findOrFail($id);
        $this->authorizeDossierResource($diagnostic);
        $diagnostic->delete();

        return response()->json([
            'success' => true,
            'message' => 'Diagnostic supprimé',
        ]);
    }
}
