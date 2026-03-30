<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\Dhis2Service;
use App\Services\EndosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Dhis2Controller extends Controller
{
    // ── DHIS2 ────────────────────────────────────────────────────────────────

    public function healthCheck(Dhis2Service $dhis2): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $dhis2->healthCheck(),
        ]);
    }

    public function indicators(Dhis2Service $dhis2, Request $request): JsonResponse
    {
        $period = $request->query('period', now()->format('Ym'));

        return response()->json([
            'success' => true,
            'data'    => $dhis2->collectTlmIndicators($period),
        ]);
    }

    public function pushIndicators(Dhis2Service $dhis2, Request $request): JsonResponse
    {
        $request->validate([
            'org_unit' => 'required|string',
            'period'   => 'nullable|string|regex:/^\d{6}$/',
        ]);

        $result = $dhis2->pushTlmIndicators(
            $request->input('org_unit'),
            $request->input('period', now()->format('Ym'))
        );

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    public function organisationUnits(Dhis2Service $dhis2, Request $request): JsonResponse
    {
        $query = $request->query('q');
        $units = $query
            ? $dhis2->searchOrganisationUnits($query)
            : $dhis2->getOrganisationUnits(['level' => $request->query('level', 1)]);

        return response()->json([
            'success' => true,
            'data'    => $units,
        ]);
    }

    public function dataElements(Dhis2Service $dhis2): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $dhis2->getDataElements(),
        ]);
    }

    public function datasets(Dhis2Service $dhis2): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $dhis2->getDatasets(),
        ]);
    }

    public function mappingConfig(): JsonResponse
    {
        $dataElements = config('services.dhis2.data_elements', []);
        $mapped = array_filter($dataElements);
        $unmapped = array_diff_key($dataElements, $mapped);

        return response()->json([
            'success' => true,
            'data'    => [
                'dataset_uid'   => config('services.dhis2.dataset_uid'),
                'data_elements' => $dataElements,
                'mapped_count'  => count($mapped),
                'unmapped_count' => count($unmapped),
                'unmapped_keys' => array_keys($unmapped),
            ],
        ]);
    }

    public function syncStatus(Dhis2Service $dhis2): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'dhis2_last_sync' => $dhis2->getLastSyncInfo(),
                'endos_last_sync' => (new EndosService())->getLastSyncInfo(),
            ],
        ]);
    }

    // ── ENDOS ────────────────────────────────────────────────────────────────

    public function endosHealthCheck(): JsonResponse
    {
        $endos = new EndosService();

        return response()->json([
            'success' => true,
            'data'    => $endos->healthCheck(),
        ]);
    }

    public function endosPushIndicators(Request $request): JsonResponse
    {
        $request->validate([
            'period' => 'nullable|string|regex:/^\d{6}$/',
        ]);

        $endos = new EndosService();
        $result = $endos->pushIndicators($request->input('period'));

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    public function endosSyncOrgUnits(): JsonResponse
    {
        $endos = new EndosService();
        $result = $endos->syncOrganisationUnits();

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    public function endosOrgUnitMapping(): JsonResponse
    {
        $endos = new EndosService();

        return response()->json([
            'success' => true,
            'data'    => [
                'enabled'      => $endos->isEnabled(),
                'mapping'      => $endos->getOrgUnitMapping(),
                'org_unit_root' => config('services.endos.org_unit_root'),
            ],
        ]);
    }

    // ── Metadata combiné (pour le dashboard interop) ─────────────────────────

    public function metadata(Dhis2Service $dhis2): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'dhis2' => [
                    'health'         => $dhis2->healthCheck(),
                    'mapping'        => config('services.dhis2.data_elements', []),
                    'dataset_uid'    => config('services.dhis2.dataset_uid'),
                    'last_sync'      => $dhis2->getLastSyncInfo(),
                ],
                'endos' => [
                    'enabled'        => config('services.endos.enabled', false),
                    'health'         => (new EndosService())->healthCheck(),
                    'org_unit_root'  => config('services.endos.org_unit_root'),
                    'last_sync'      => (new EndosService())->getLastSyncInfo(),
                ],
            ],
        ]);
    }
}
