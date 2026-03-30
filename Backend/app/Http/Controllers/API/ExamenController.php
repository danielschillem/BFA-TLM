<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExamenRequest;
use App\Http\Resources\ExamenResource;
use App\Models\Examen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamenController extends Controller
{
    public function store(StoreExamenRequest $request): JsonResponse
    {
        $examen = Examen::create($request->validated() + [
            'dossier_patient_id' => $request->dossier_patient_id,
            'statut' => 'prescrit',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Examen prescrit',
            'data' => new ExamenResource($examen),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $examen = Examen::findOrFail($id);

        $request->validate([
            'resultats'              => 'nullable|string|max:5000',
            'commentaire'            => 'nullable|string|max:2000',
            'statut'                 => 'nullable|in:prescrit,en_cours,resultat_disponible,interprete',
            'date_examen'            => 'nullable|date',
            'date_reception_resultat'=> 'nullable|date',
        ]);

        $examen->update($request->only([
            'resultats', 'commentaire', 'statut',
            'date_examen', 'date_reception_resultat',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Examen mis à jour',
            'data' => new ExamenResource($examen->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        Examen::findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Examen supprimé',
        ]);
    }
}
