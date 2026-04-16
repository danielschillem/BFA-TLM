<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Resources\ConstanteResource;
use App\Models\Constante;
use App\Models\DossierPatient;
use Illuminate\Http\JsonResponse;

class ConstanteController extends Controller
{
    use AuthorizesStructureAccess;

    public function index(int $dossierId): JsonResponse
    {
        $this->authorizeDossierAccess($dossierId);
        $this->authorizeMedecinPatientRelation($dossierId);

        $dossier = DossierPatient::findOrFail($dossierId);

        $constantes = $dossier->constantes()
            ->with('user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => ConstanteResource::collection($constantes),
        ]);
    }
}
