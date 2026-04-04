<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Requests\StoreAllergieRequest;
use App\Http\Resources\AllergieResource;
use App\Models\Allergie;
use Illuminate\Http\JsonResponse;

class AllergieController extends Controller
{
    use AuthorizesStructureAccess;

    public function store(StoreAllergieRequest $request): JsonResponse
    {
        $this->authorizeDossierAccess($request->validated()['dossier_patient_id']);

        $allergie = Allergie::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Allergie enregistrée',
            'data' => new AllergieResource($allergie),
        ], 201);
    }

    public function update(StoreAllergieRequest $request, int $id): JsonResponse
    {
        $allergie = Allergie::findOrFail($id);
        $this->authorizeDossierResource($allergie);
        $allergie->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Allergie mise à jour',
            'data' => new AllergieResource($allergie->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $allergie = Allergie::findOrFail($id);
        $this->authorizeDossierResource($allergie);
        $allergie->delete();

        return response()->json([
            'success' => true,
            'message' => 'Allergie supprimée',
        ]);
    }
}
