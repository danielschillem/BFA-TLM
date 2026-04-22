<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Requests\StoreHabitudeDeVieRequest;
use App\Http\Resources\HabitudeDeVieResource;
use App\Models\HabitudeDeVie;
use Illuminate\Http\JsonResponse;

class HabitudeDeVieController extends Controller
{
    use AuthorizesStructureAccess;
    public function store(StoreHabitudeDeVieRequest $request): JsonResponse
    {
        $validated = $request->validated();
        if (!empty($validated['dossier_patient_id'])) {
            $this->authorizeDossierAccess($validated['dossier_patient_id']);
            $this->authorizeMedecinPatientRelation($validated['dossier_patient_id']);
        }

        $habitude = HabitudeDeVie::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Habitude de vie enregistrée',
            'data' => new HabitudeDeVieResource($habitude),
        ], 201);
    }

    public function update(StoreHabitudeDeVieRequest $request, int $id): JsonResponse
    {
        $habitude = HabitudeDeVie::findOrFail($id);
        $this->authorizeDossierResource($habitude);
        $habitude->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Habitude de vie mise à jour',
            'data' => new HabitudeDeVieResource($habitude->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $habitude = HabitudeDeVie::findOrFail($id);
        $this->authorizeDossierResource($habitude);
        $habitude->delete();

        return response()->json([
            'success' => true,
            'message' => 'Habitude de vie supprimée',
        ]);
    }
}
