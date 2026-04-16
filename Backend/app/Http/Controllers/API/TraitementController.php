<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Requests\StoreTraitementRequest;
use App\Http\Resources\TraitementResource;
use App\Models\Traitement;
use Illuminate\Http\JsonResponse;

class TraitementController extends Controller
{
    use AuthorizesStructureAccess;
    public function store(StoreTraitementRequest $request): JsonResponse
    {
        $validated = $request->validated();
        abort_unless(!empty($validated['dossier_patient_id']), 422, 'Le dossier patient est requis.');
        $this->authorizeDossierAccess($validated['dossier_patient_id']);
        $this->authorizeMedecinPatientRelation($validated['dossier_patient_id']);

        $traitement = Traitement::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Traitement créé',
            'data' => new TraitementResource($traitement),
        ], 201);
    }

    public function update(StoreTraitementRequest $request, int $id): JsonResponse
    {
        $traitement = Traitement::findOrFail($id);
        $this->authorizeDossierResource($traitement);
        $traitement->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Traitement mis à jour',
            'data' => new TraitementResource($traitement->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $traitement = Traitement::findOrFail($id);
        $this->authorizeDossierResource($traitement);
        $traitement->delete();

        return response()->json([
            'success' => true,
            'message' => 'Traitement supprimé',
        ]);
    }
}
