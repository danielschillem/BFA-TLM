<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Dhis2Service
{
    protected string $baseUrl;
    protected string $apiVersion;
    protected ?string $username;
    protected ?string $password;
    protected int $timeout;
    protected array $dataElements;
    protected ?string $datasetUid;

    public function __construct(array $config = [])
    {
        $cfg = $config ?: config('services.dhis2', []);
        $this->baseUrl     = rtrim($cfg['base_url'] ?? '', '/');
        $this->apiVersion  = $cfg['api_version'] ?? '2.40';
        $this->username    = $cfg['username'] ?? null;
        $this->password    = $cfg['password'] ?? null;
        $this->timeout     = $cfg['timeout'] ?? 30;
        $this->dataElements = $cfg['data_elements'] ?? [];
        $this->datasetUid  = $cfg['dataset_uid'] ?? null;
    }

    // ── HTTP Client ──────────────────────────────────────────────────────────

    protected function client(): \Illuminate\Http\Client\PendingRequest
    {
        $request = Http::baseUrl($this->apiUrl())
            ->timeout($this->timeout)
            ->withHeaders([
                'Accept'       => 'application/json',
                'Content-Type' => 'application/json',
            ]);

        if ($this->username && $this->password) {
            $request = $request->withBasicAuth($this->username, $this->password);
        }

        return $request;
    }

    protected function apiUrl(): string
    {
        return "{$this->baseUrl}/api/{$this->apiVersion}";
    }

    // ── Health Check ─────────────────────────────────────────────────────────

    public function healthCheck(): array
    {
        try {
            $response = $this->client()->get('/system/info');

            if ($response->successful()) {
                $info = $response->json();
                return [
                    'status'  => 'online',
                    'version' => $info['version'] ?? 'unknown',
                    'revision' => $info['revision'] ?? null,
                    'serverDate' => $info['serverDate'] ?? null,
                    'contextPath' => $info['contextPath'] ?? null,
                ];
            }

            return ['status' => 'error', 'message' => "HTTP {$response->status()}"];
        } catch (\Exception $e) {
            return ['status' => 'offline', 'message' => $e->getMessage()];
        }
    }

    // ── Organisation Units ───────────────────────────────────────────────────

    public function getOrganisationUnits(array $params = []): array
    {
        $defaults = [
            'fields' => 'id,displayName,level,parent[id,displayName],path',
            'paging' => 'false',
        ];

        $response = $this->client()->get('/organisationUnits', array_merge($defaults, $params));

        if ($response->successful()) {
            return $response->json('organisationUnits', []);
        }

        throw new \RuntimeException("DHIS2 org units: HTTP {$response->status()}");
    }

    public function searchOrganisationUnits(string $query): array
    {
        return $this->getOrganisationUnits([
            'filter'  => "displayName:ilike:{$query}",
            'fields'  => 'id,displayName,level,path,parent[id,displayName]',
        ]);
    }

    public function getOrganisationUnit(string $uid): ?array
    {
        $response = $this->client()->get("/organisationUnits/{$uid}", [
            'fields' => 'id,displayName,shortName,level,path,parent[id,displayName],children[id,displayName],openingDate,coordinates',
        ]);

        return $response->successful() ? $response->json() : null;
    }

    // ── Data Elements & Datasets ─────────────────────────────────────────────

    public function getDataElements(array $params = []): array
    {
        $defaults = [
            'fields' => 'id,displayName,valueType,aggregationType,categoryCombo[id,displayName]',
            'paging' => 'false',
        ];

        $response = $this->client()->get('/dataElements', array_merge($defaults, $params));

        return $response->successful() ? $response->json('dataElements', []) : [];
    }

    public function getDatasets(array $params = []): array
    {
        $defaults = [
            'fields' => 'id,displayName,periodType,dataSetElements[dataElement[id,displayName]],organisationUnits[id,displayName]',
            'paging' => 'false',
        ];

        $response = $this->client()->get('/dataSets', array_merge($defaults, $params));

        return $response->successful() ? $response->json('dataSets', []) : [];
    }

    // ── Push Aggregate Data Values ───────────────────────────────────────────

    public function pushDataValues(array $dataValues): array
    {
        $payload = ['dataValues' => $dataValues];

        $response = $this->client()->post('/dataValueSets', $payload);

        if ($response->successful()) {
            $result = $response->json();
            Log::info('DHIS2: données poussées', [
                'imported'  => $result['importCount']['imported'] ?? 0,
                'updated'   => $result['importCount']['updated'] ?? 0,
                'ignored'   => $result['importCount']['ignored'] ?? 0,
            ]);
            return $result;
        }

        Log::error('DHIS2: erreur push dataValues', [
            'status'  => $response->status(),
            'body'    => $response->body(),
        ]);

        throw new \RuntimeException("DHIS2 push failed: HTTP {$response->status()}");
    }

    public function buildTlmDataValues(string $orgUnitUid, string $period, array $indicators): array
    {
        $dataValues = [];

        foreach ($indicators as $key => $value) {
            $deUid = $this->dataElements[$key] ?? null;
            if (!$deUid || $value === null) {
                continue;
            }

            $dataValues[] = [
                'dataElement'    => $deUid,
                'period'         => $period,        // ex: '202603' (YYYYMM)
                'orgUnit'        => $orgUnitUid,
                'value'          => (string) $value,
                'categoryOptionCombo' => config('services.dhis2.category_combo', 'default'),
            ];
        }

        return $dataValues;
    }

    public function pushTlmIndicators(string $orgUnitUid, string $period): array
    {
        $indicators = $this->collectTlmIndicators($period);
        $dataValues = $this->buildTlmDataValues($orgUnitUid, $period, $indicators);

        if (empty($dataValues)) {
            return ['status' => 'skipped', 'message' => 'Aucun indicateur mappé'];
        }

        return $this->pushDataValues($dataValues);
    }

    // ── Collect TLM Indicators ───────────────────────────────────────────────

    public function collectTlmIndicators(?string $period = null): array
    {
        $period = $period ?: now()->format('Ym');
        $year  = (int) substr($period, 0, 4);
        $month = (int) substr($period, 4, 2);

        $start = \Carbon\Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        $totalConsultations = \App\Models\Consultation::whereBetween('date', [$start, $end])->count();
        $completedConsultations = \App\Models\Consultation::whereBetween('date', [$start, $end])
            ->where('statut', 'terminee')->count();

        $totalAppointments = \App\Models\RendezVous::whereBetween('date', [$start, $end])->count();
        $noShowAppointments = \App\Models\RendezVous::whereBetween('date', [$start, $end])
            ->where('statut', 'absent')->count();

        $totalTeleexpertise = \App\Models\Teleexpertise::whereBetween('created_at', [$start, $end])->count();
        $answeredTeleexpertise = \App\Models\Teleexpertise::whereBetween('created_at', [$start, $end])
            ->where('statut', 'repondu')->count();

        $totalPrescriptions = \App\Models\Prescription::whereBetween('created_at', [$start, $end])->count();

        $patientsSeen = \App\Models\Consultation::whereBetween('date', [$start, $end])
            ->distinct('dossier_patient_id')->count('dossier_patient_id');

        $structuresCount = \App\Models\Structure::where('actif', true)->count();

        return [
            'total_consultations'        => $totalConsultations,
            'completed_consultations'    => $completedConsultations,
            'completion_rate'            => $totalConsultations > 0
                ? round(($completedConsultations / $totalConsultations) * 100, 1) : 0,
            'no_show_rate'               => $totalAppointments > 0
                ? round(($noShowAppointments / $totalAppointments) * 100, 1) : 0,
            'total_teleexpertise'        => $totalTeleexpertise,
            'teleexpertise_response_rate' => $totalTeleexpertise > 0
                ? round(($answeredTeleexpertise / $totalTeleexpertise) * 100, 1) : 0,
            'e_prescriptions'            => $totalPrescriptions,
            'patients_seen'              => $patientsSeen,
            'structures_count'           => $structuresCount,
            'period'                     => $period,
            'period_start'               => $start->toDateString(),
            'period_end'                 => $end->toDateString(),
        ];
    }

    // ── Analytics (lecture) ──────────────────────────────────────────────────

    public function getAnalytics(array $params): array
    {
        $response = $this->client()->get('/analytics', $params);

        return $response->successful() ? $response->json() : [];
    }

    // ── Tracker (events individuels — optionnel) ─────────────────────────────

    public function pushTrackerEvent(array $event): array
    {
        $response = $this->client()->post('/tracker', [
            'events' => [$event],
        ]);

        return $response->successful() ? $response->json() : [];
    }

    // ── Sync logs ────────────────────────────────────────────────────────────

    public function getLastSyncInfo(): ?array
    {
        return Cache::get('dhis2_last_sync');
    }

    public function recordSync(array $result, string $target = 'dhis2'): void
    {
        $info = [
            'timestamp'  => now()->toIso8601String(),
            'target'     => $target,
            'result'     => $result,
        ];

        Cache::put("{$target}_last_sync", $info, now()->addDays(30));

        Log::info("Sync {$target} terminée", $info);
    }
}
