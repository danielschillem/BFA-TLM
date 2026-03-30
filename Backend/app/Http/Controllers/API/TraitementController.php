<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTraitementRequest;
use App\Http\Resources\TraitementResource;
use App\Models\Traitement;
use Illuminate\Http\JsonResponse;

class TraitementController extends Controller
{
    public function store(StoreTraitementRequest $request): JsonResponse
    {
        $traitement = Traitement::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Traitement créé',
            'data' => new TraitementResource($traitement),
        ], 201);
    }

    public function update(StoreTraitementRequest $request, int $id): JsonResponse
    {
        $traitement = Traitement::findOrFail($id);
        $traitement->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Traitement mis à jour',
            'data' => new TraitementResource($traitement->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        Traitement::findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Traitement supprimé',
        ]);
    }
}
