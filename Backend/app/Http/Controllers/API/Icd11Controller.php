<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\Icd11Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Icd11Controller extends Controller
{
    public function __construct(private Icd11Service $icd11)
    {
    }

    /**
     * Rechercher des codes ICD-11 par texte libre.
     * GET /api/v1/icd11/search?q=diabète&limit=20
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'flexible' => ['nullable', 'boolean'],
        ]);

        $results = $this->icd11->search(
            query: $request->input('q'),
            flexibleSearch: $request->boolean('flexible', true),
            flatResults: $request->integer('limit', 20),
        );

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    /**
     * Obtenir les détails d'un code ICD-11.
     * GET /api/v1/icd11/lookup/{code}  (ex: 5A11, BA00.Z)
     */
    public function lookup(string $code): JsonResponse
    {
        $entity = $this->icd11->lookup($code);

        return response()->json([
            'success' => true,
            'data' => $entity,
        ]);
    }

    /**
     * Valider un code ICD-11.
     * GET /api/v1/icd11/validate/{code}
     */
    public function validate(string $code): JsonResponse
    {
        $result = $this->icd11->validate($code);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Crosswalk : convertir un code CIM-10 en ICD-11.
     * GET /api/v1/icd11/crosswalk/{icd10Code}  (ex: E11.9)
     */
    public function crosswalk(string $icd10Code): JsonResponse
    {
        $result = $this->icd11->crosswalkFromIcd10($icd10Code);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Health check de l'API ICD-11.
     * GET /api/v1/icd11/health
     */
    public function health(): JsonResponse
    {
        $result = $this->icd11->healthCheck();

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
