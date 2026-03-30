<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConstanteResource;
use App\Models\Constante;
use App\Models\DossierPatient;
use Illuminate\Http\JsonResponse;

class ConstanteController extends Controller
{
    public function index(int $dossierId): JsonResponse
    {
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
