<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service SNOMED CT — recherche et lookup via l'API Snowstorm (SNOMED International).
 *
 * @see https://browser.ihtsdotools.org/snowstorm/snomed-ct/
 * Utilise l'édition internationale (gratuite, pas de licence nécessaire pour le browser).
 */
class SnomedService
{
    private string $baseUrl;
    private string $branch;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.snomed.base_url', 'https://browser.ihtsdotools.org/snowstorm/snomed-ct');
        $this->branch = config('services.snomed.branch', 'MAIN/2024-09-01');
        $this->timeout = (int) config('services.snomed.timeout', 15);
    }

    /**
     * Recherche de concepts SNOMED CT par terme.
     *
     * @param string $term  Texte de recherche (min 2 caractères)
     * @param int    $limit Nombre max de résultats
     * @param string|null $semanticTag  Filtre par tag sémantique (disorder, finding, procedure, substance, etc.)
     * @return array{items: array, total: int}
     */
    public function search(string $term, int $limit = 20, ?string $semanticTag = null): array
    {
        $term = trim($term);
        if (mb_strlen($term) < 2) {
            return ['items' => [], 'total' => 0];
        }

        $cacheKey = 'snomed:search:' . md5($term . $limit . ($semanticTag ?? ''));

        return Cache::remember($cacheKey, 3600, function () use ($term, $limit, $semanticTag) {
            try {
                $params = [
                    'term' => $term,
                    'activeFilter' => true,
                    'limit' => min($limit, 50),
                    'offset' => 0,
                    'language' => 'fr,en',
                ];

                if ($semanticTag) {
                    $params['semanticTag'] = $semanticTag;
                }

                $response = Http::timeout($this->timeout)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Accept-Language' => 'fr;q=0.9,en;q=0.8',
                    ])
                    ->get("{$this->baseUrl}/browser/{$this->branch}/descriptions", $params);

                if (!$response->successful()) {
                    Log::warning('SNOMED search failed', [
                        'status' => $response->status(),
                        'term' => $term,
                    ]);
                    return ['items' => [], 'total' => 0];
                }

                $data = $response->json();
                $items = collect($data['items'] ?? [])
                    ->map(fn($item) => [
                        'conceptId' => $item['concept']['conceptId'] ?? null,
                        'code' => $item['concept']['conceptId'] ?? null,
                        'display' => $item['concept']['fsn']['term'] ?? $item['term'] ?? '',
                        'preferredTerm' => $item['concept']['pt']['term'] ?? $item['term'] ?? '',
                        'semanticTag' => $item['concept']['fsn']['term']
                            ? $this->extractSemanticTag($item['concept']['fsn']['term'] ?? '')
                            : null,
                        'active' => $item['concept']['active'] ?? true,
                    ])
                    ->filter(fn($item) => $item['conceptId'] !== null)
                    ->values()
                    ->toArray();

                return [
                    'items' => $items,
                    'total' => $data['totalElements'] ?? count($items),
                ];

            } catch (\Exception $e) {
                Log::error('SNOMED search error', [
                    'message' => $e->getMessage(),
                    'term' => $term,
                ]);
                return ['items' => [], 'total' => 0];
            }
        });
    }

    /**
     * Lookup d'un concept SNOMED CT par son ID.
     */
    public function lookup(string $conceptId): ?array
    {
        $conceptId = trim($conceptId);
        if (!preg_match('/^\d{6,18}$/', $conceptId)) {
            return null;
        }

        $cacheKey = 'snomed:concept:' . $conceptId;

        return Cache::remember($cacheKey, 86400, function () use ($conceptId) {
            try {
                $response = Http::timeout($this->timeout)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Accept-Language' => 'fr;q=0.9,en;q=0.8',
                    ])
                    ->get("{$this->baseUrl}/browser/{$this->branch}/concepts/{$conceptId}");

                if (!$response->successful()) {
                    return null;
                }

                $data = $response->json();

                return [
                    'conceptId' => $data['conceptId'],
                    'code' => $data['conceptId'],
                    'display' => $data['fsn']['term'] ?? '',
                    'preferredTerm' => $data['pt']['term'] ?? '',
                    'semanticTag' => $this->extractSemanticTag($data['fsn']['term'] ?? ''),
                    'active' => $data['active'] ?? true,
                    'definitionStatus' => $data['definitionStatus'] ?? null,
                    'moduleId' => $data['moduleId'] ?? null,
                ];

            } catch (\Exception $e) {
                Log::error('SNOMED lookup error', [
                    'message' => $e->getMessage(),
                    'conceptId' => $conceptId,
                ]);
                return null;
            }
        });
    }

    /**
     * Valider qu'un code SNOMED CT existe et est actif.
     */
    public function validate(string $conceptId): array
    {
        $concept = $this->lookup($conceptId);

        if (!$concept) {
            return [
                'valid' => false,
                'code' => $conceptId,
                'message' => 'Concept SNOMED CT non trouvé.',
            ];
        }

        return [
            'valid' => $concept['active'],
            'code' => $concept['code'],
            'display' => $concept['preferredTerm'],
            'active' => $concept['active'],
            'message' => $concept['active']
                ? 'Concept SNOMED CT valide et actif.'
                : 'Concept SNOMED CT trouvé mais inactif.',
        ];
    }

    /**
     * Recherche de descendants d'un concept (hiérarchie).
     */
    public function children(string $conceptId, int $limit = 50): array
    {
        $cacheKey = 'snomed:children:' . $conceptId;

        return Cache::remember($cacheKey, 86400, function () use ($conceptId, $limit) {
            try {
                $response = Http::timeout($this->timeout)
                    ->withHeaders(['Accept' => 'application/json'])
                    ->get("{$this->baseUrl}/{$this->branch}/concepts/{$conceptId}/children", [
                        'limit' => min($limit, 100),
                    ]);

                if (!$response->successful()) {
                    return [];
                }

                return collect($response->json())
                    ->map(fn($item) => [
                        'conceptId' => $item['conceptId'] ?? null,
                        'code' => $item['conceptId'] ?? null,
                        'display' => $item['fsn']['term'] ?? $item['pt']['term'] ?? '',
                        'preferredTerm' => $item['pt']['term'] ?? '',
                        'active' => $item['active'] ?? true,
                    ])
                    ->values()
                    ->toArray();

            } catch (\Exception $e) {
                Log::error('SNOMED children error', [
                    'message' => $e->getMessage(),
                    'conceptId' => $conceptId,
                ]);
                return [];
            }
        });
    }

    /**
     * Recherches spécialisées par domaine clinique.
     */
    public function searchDisorders(string $term, int $limit = 20): array
    {
        return $this->search($term, $limit, 'disorder');
    }

    public function searchProcedures(string $term, int $limit = 20): array
    {
        return $this->search($term, $limit, 'procedure');
    }

    public function searchFindings(string $term, int $limit = 20): array
    {
        return $this->search($term, $limit, 'finding');
    }

    public function searchSubstances(string $term, int $limit = 20): array
    {
        return $this->search($term, $limit, 'substance');
    }

    public function searchBodyStructures(string $term, int $limit = 20): array
    {
        return $this->search($term, $limit, 'body structure');
    }

    /**
     * Vérifier la disponibilité du serveur Snowstorm.
     */
    public function health(): array
    {
        try {
            $response = Http::timeout(5)
                ->get("{$this->baseUrl}/version");

            return [
                'status' => $response->successful() ? 'ok' : 'degraded',
                'server' => $this->baseUrl,
                'branch' => $this->branch,
                'version' => $response->successful() ? $response->json('version') : null,
            ];

        } catch (\Exception $e) {
            return [
                'status' => 'unavailable',
                'server' => $this->baseUrl,
                'branch' => $this->branch,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Extraire le tag sémantique du FSN. Ex: "Diabetes mellitus (disorder)" → "disorder"
     */
    private function extractSemanticTag(string $fsn): ?string
    {
        if (preg_match('/\(([^)]+)\)\s*$/', $fsn, $matches)) {
            return $matches[1];
        }
        return null;
    }
}
