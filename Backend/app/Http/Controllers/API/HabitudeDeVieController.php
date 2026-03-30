<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHabitudeDeVieRequest;
use App\Http\Resources\HabitudeDeVieResource;
use App\Models\HabitudeDeVie;
use Illuminate\Http\JsonResponse;

class HabitudeDeVieController extends Controller
{
    public function store(StoreHabitudeDeVieRequest $request): JsonResponse
    {
        $habitude = HabitudeDeVie::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Habitude de vie enregistrée',
            'data' => new HabitudeDeVieResource($habitude),
        ], 201);
    }

    public function update(StoreHabitudeDeVieRequest $request, int $id): JsonResponse
    {
        $habitude = HabitudeDeVie::findOrFail($id);
        $habitude->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Habitude de vie mise à jour',
            'data' => new HabitudeDeVieResource($habitude->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        HabitudeDeVie::findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Habitude de vie supprimée',
        ]);
    }
}
