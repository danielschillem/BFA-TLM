<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAntecedentRequest;
use App\Http\Resources\AntecedentResource;
use App\Models\Antecedent;
use Illuminate\Http\JsonResponse;

class AntecedentController extends Controller
{
    public function store(StoreAntecedentRequest $request): JsonResponse
    {
        $antecedent = Antecedent::create(
            $request->validated() + ['user_id' => auth()->id()]
        );

        return response()->json([
            'success' => true,
            'message' => 'Antécédent créé',
            'data' => new AntecedentResource($antecedent),
        ], 201);
    }

    public function update(StoreAntecedentRequest $request, int $id): JsonResponse
    {
        $antecedent = Antecedent::findOrFail($id);
        $antecedent->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Antécédent mis à jour',
            'data' => new AntecedentResource($antecedent->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        Antecedent::findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Antécédent supprimé',
        ]);
    }
}
