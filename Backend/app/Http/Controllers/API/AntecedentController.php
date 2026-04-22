<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Requests\StoreAntecedentRequest;
use App\Http\Resources\AntecedentResource;
use App\Models\Antecedent;
use Illuminate\Http\JsonResponse;

class AntecedentController extends Controller
{
    use AuthorizesStructureAccess;

    public function store(StoreAntecedentRequest $request): JsonResponse
    {
        $this->authorizeDossierAccess($request->validated()['dossier_patient_id']);
        $this->authorizeMedecinPatientRelation($request->validated()['dossier_patient_id']);

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
        $this->authorizeDossierResource($antecedent);
        $antecedent->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Antécédent mis à jour',
            'data' => new AntecedentResource($antecedent->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $antecedent = Antecedent::findOrFail($id);
        $this->authorizeDossierResource($antecedent);
        $antecedent->delete();

        return response()->json([
            'success' => true,
            'message' => 'Antécédent supprimé',
        ]);
    }
}
