<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAllergieRequest;
use App\Http\Resources\AllergieResource;
use App\Models\Allergie;
use Illuminate\Http\JsonResponse;

class AllergieController extends Controller
{
    public function store(StoreAllergieRequest $request): JsonResponse
    {
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
        $allergie->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Allergie mise à jour',
            'data' => new AllergieResource($allergie->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        Allergie::findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Allergie supprimée',
        ]);
    }
}
