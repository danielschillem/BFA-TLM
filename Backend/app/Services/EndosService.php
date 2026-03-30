<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class EndosService
{
    protected Dhis2Service $dhis2;
    protected bool $enabled;
    protected ?string $orgUnitRoot;
    protected array $orgUnitMapping;

    public function __construct()
    {
        $cfg = config('services.endos', []);
        $this->enabled = (bool) ($cfg['enabled'] ?? false);
        $this->orgUnitRoot = $cfg['org_unit_root'] ?? null;

        // Mapping JSON structures TLM → org units ENDOS
        $mappingJson = $cfg['org_unit_mapping'] ?? null;
        $this->orgUnitMapping = $mappingJson ? (json_decode($mappingJson, true) ?: []) : [];

        // Client DHIS2 pointant vers l'instance ENDOS
        $this->dhis2 = new Dhis2Service([
            'base_url'      => $cfg['base_url'] ?? '',
            'api_version'   => $cfg['api_version'] ?? '2.40',
            'username'      => $cfg['username'] ?? null,
            'password'      => $cfg['password'] ?? null,
            'timeout'       => $cfg['timeout'] ?? 30,
            'data_elements' => config('services.dhis2.data_elements', []),
            'dataset_uid'   => $cfg['dataset_uid'] ?? null,
        ]);
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    // ── Health Check ─────────────────────────────────────────────────────────

    public function healthCheck(): array
    {
        if (!$this->enabled) {
            return ['status' => 'disabled', 'message' => 'ENDOS non activé'];
        }

        return $this->dhis2->healthCheck();
    }

    // ── Organisation Unit Mapping ────────────────────────────────────────────

    public function getEndosOrgUnit(string $structureCode): ?string
    {
        return $this->orgUnitMapping[$structureCode] ?? null;
    }

    public function setOrgUnitMapping(string $structureCode, string $endosOrgUnitUid): void
    {
        $this->orgUnitMapping[$structureCode] = $endosOrgUnitUid;
    }

    public function getOrgUnitMapping(): array
    {
        return $this->orgUnitMapping;
    }

    public function syncOrganisationUnits(): array
    {
        if (!$this->enabled) {
            return ['status' => 'disabled'];
        }

        $structures = \App\Models\Structure::where('actif', true)
            ->with('localite')
            ->get();

        $mapped = 0;
        $unmapped = [];

        foreach ($structures as $structure) {
            $existing = $this->getEndosOrgUnit($structure->code_structure);
            if ($existing) {
                $mapped++;
                continue;
            }

            // Tenter de trouver l'org unit dans ENDOS par nom
            $results = $this->dhis2->searchOrganisationUnits($structure->libelle);
            if (!empty($results)) {
                $this->setOrgUnitMapping($structure->code_structure, $results[0]['id']);
                $mapped++;
            } else {
                $unmapped[] = [
                    'code'      => $structure->code_structure,
                    'libelle'   => $structure->libelle,
                    'localite'  => $structure->localite?->region ?? 'N/A',
                ];
            }
        }

        return [
            'total_structures' => $structures->count(),
            'mapped'           => $mapped,
            'unmapped'         => $unmapped,
        ];
    }

    // ── Push Indicators ──────────────────────────────────────────────────────

    public function pushIndicators(?string $period = null): array
    {
        if (!$this->enabled) {
            return ['status' => 'disabled', 'message' => 'ENDOS non activé'];
        }

        if (!$this->orgUnitRoot) {
            return ['status' => 'error', 'message' => 'ENDOS_ORG_UNIT_ROOT non configuré'];
        }

        $period = $period ?: now()->format('Ym');

        try {
            $result = $this->dhis2->pushTlmIndicators($this->orgUnitRoot, $period);
            $this->dhis2->recordSync($result, 'endos');
            return $result;
        } catch (\Exception $e) {
            Log::error('ENDOS push failed', ['error' => $e->getMessage()]);
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    // ── Push par structure ───────────────────────────────────────────────────

    public function pushIndicatorsByStructure(?string $period = null): array
    {
        if (!$this->enabled) {
            return ['status' => 'disabled'];
        }

        $period = $period ?: now()->format('Ym');
        $results = [];

        $structures = \App\Models\Structure::where('actif', true)->get();

        foreach ($structures as $structure) {
            $orgUnitUid = $this->getEndosOrgUnit($structure->code_structure);
            if (!$orgUnitUid) {
                $results[$structure->code_structure] = ['status' => 'skipped', 'reason' => 'no ENDOS mapping'];
                continue;
            }

            try {
                $result = $this->dhis2->pushTlmIndicators($orgUnitUid, $period);
                $results[$structure->code_structure] = $result;
            } catch (\Exception $e) {
                $results[$structure->code_structure] = ['status' => 'error', 'message' => $e->getMessage()];
            }
        }

        $this->dhis2->recordSync(['structures' => count($results)], 'endos');

        return $results;
    }

    // ── Analytics (lecture depuis ENDOS) ──────────────────────────────────────

    public function getAnalytics(array $params = []): array
    {
        if (!$this->enabled) {
            return [];
        }

        return $this->dhis2->getAnalytics($params);
    }

    public function getLastSyncInfo(): ?array
    {
        return $this->dhis2->getLastSyncInfo();
    }
}
