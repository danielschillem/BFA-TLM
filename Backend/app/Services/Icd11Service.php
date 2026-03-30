<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client pour l'API ICD-11 de l'OMS.
 *
 * @see https://icd.who.int/icdapi
 * Implémente : OAuth2 token, recherche, lookup, codage, crosswalk ICD-10↔ICD-11.
 */
class Icd11Service
{
    private string $tokenEndpoint;
    private string $apiBaseUrl;
    private string $clientId;
    private string $clientSecret;
    private string $apiVersion;
    private string $releaseId;
    private string $language;
    private string $linearization;
    private int $timeout;

    public function __construct()
    {
        $config = config('services.icd11');
        $this->tokenEndpoint = $config['token_endpoint'];
        $this->apiBaseUrl = $config['api_base_url'];
        $this->clientId = $config['client_id'] ?? '';
        $this->clientSecret = $config['client_secret'] ?? '';
        $this->apiVersion = $config['api_version'];
        $this->releaseId = $config['release_id'];
        $this->language = $config['language'];
        $this->linearization = $config['linearization'];
        $this->timeout = $config['timeout'];
    }

    // ── OAuth2 Token ─────────────────────────────────────────────────────────

    /**
     * Obtenir un access token OAuth2 (cache 55 min sur les 60 de validité).
     */
    public function getAccessToken(): string
    {
        return Cache::remember('icd11_access_token', 3300, function () {
            $response = Http::asForm()
                ->timeout($this->timeout)
                ->post($this->tokenEndpoint, [
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                    'grant_type' => 'client_credentials',
                    'scope' => 'icdapi_access',
                ]);

            if (!$response->successful()) {
                Log::error('ICD-11 token error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \RuntimeException('Impossible d\'obtenir un token ICD-11 : ' . $response->status());
            }

            return $response->json('access_token');
        });
    }

    // ── Recherche ────────────────────────────────────────────────────────────

    /**
     * Rechercher des entités ICD-11 par texte libre.
     *
     * @param string $query Termes de recherche (ex: "diabète type 2")
     * @param bool $flexibleSearch Recherche flexible (tolère fautes)
     * @param int $flatResults Nombre max de résultats (1-100)
     * @return array{destinationEntities: array, resultChopped: bool}
     */
    public function search(string $query, bool $flexibleSearch = true, int $flatResults = 20): array
    {
        $url = "{$this->apiBaseUrl}/icd/release/11/{$this->releaseId}/{$this->linearization}/search";

        $response = $this->apiRequest('GET', $url, [
            'q' => $query,
            'subtreeFilterUsesFoundationDescendants' => 'false',
            'includeKeywordResult' => 'false',
            'useFlexisearch' => $flexibleSearch ? 'true' : 'false',
            'flatResults' => 'true',
            'highlightingEnabled' => 'false',
            'medicalCodingMode' => 'true',
        ]);

        $entities = [];
        foreach ($response['destinationEntities'] ?? [] as $entity) {
            $entities[] = $this->parseSearchEntity($entity);
        }

        return [
            'results' => array_slice($entities, 0, $flatResults),
            'total' => count($entities),
            'truncated' => $response['resultChopped'] ?? false,
        ];
    }

    // ── Lookup (détail d'une entité) ─────────────────────────────────────────

    /**
     * Obtenir les détails complets d'une entité ICD-11 par son URI ou code.
     *
     * @param string $codeOrUri Code ICD-11 (ex: "5A11") ou URI complète
     */
    public function lookup(string $codeOrUri): array
    {
        if (str_starts_with($codeOrUri, 'http')) {
            // L'API OMS retourne des URI en http:// mais l'accès se fait en https://
            $url = str_replace('http://', 'https://', $codeOrUri);
        } else {
            // Code simple (ex: "5A11") → résoudre via codeinfo pour obtenir le stemId
            $codeInfoUrl = "{$this->apiBaseUrl}/icd/release/11/{$this->releaseId}/{$this->linearization}/codeinfo/{$codeOrUri}";
            $codeInfo = $this->apiRequest('GET', $codeInfoUrl);

            if (empty($codeInfo['stemId'])) {
                throw new \RuntimeException("Code ICD-11 introuvable : {$codeOrUri}");
            }

            $url = str_replace('http://', 'https://', $codeInfo['stemId']);
        }

        $response = $this->apiRequest('GET', $url);

        return $this->parseEntity($response);
    }

    // ── Codage (validation) ──────────────────────────────────────────────────

    /**
     * Valider et normaliser un code ICD-11.
     *
     * @param string $code Code ICD-11 (ex: "5A11", "BA00.Z")
     * @return array{valid: bool, code: string, title: string, uri: string}
     */
    public function validate(string $code): array
    {
        try {
            $entity = $this->lookup($code);
            return [
                'valid' => true,
                'code' => $entity['code'],
                'title' => $entity['title'],
                'uri' => $entity['uri'],
                'definition' => $entity['definition'] ?? null,
            ];
        } catch (\Exception $e) {
            return [
                'valid' => false,
                'code' => $code,
                'title' => null,
                'uri' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    // ── Crosswalk ICD-10 ↔ ICD-11 ───────────────────────────────────────────

    /**
     * Convertir un code ICD-10 en ICD-11 (crossmap OMS officiel).
     *
     * @param string $icd10Code Code CIM-10 (ex: "E11.9")
     */
    public function crosswalkFromIcd10(string $icd10Code): array
    {
        $url = "{$this->apiBaseUrl}/icd/release/11/{$this->releaseId}/{$this->linearization}/codeinfo/{$icd10Code}";

        try {
            $response = $this->apiRequest('GET', $url, [
                'include' => 'ancestor',
            ]);

            if (!empty($response['stemId'])) {
                $entity = $this->lookup($response['stemId']);
                return [
                    'found' => true,
                    'icd10_code' => $icd10Code,
                    'icd11_code' => $entity['code'],
                    'icd11_title' => $entity['title'],
                    'icd11_uri' => $entity['uri'],
                ];
            }
        } catch (\Exception $e) {
            // Code not found in crossmap — try search
        }

        // Fallback : recherche textuelle
        return [
            'found' => false,
            'icd10_code' => $icd10Code,
            'icd11_code' => null,
            'icd11_title' => null,
            'suggestion' => 'Utilisez la recherche textuelle pour trouver le code ICD-11 équivalent.',
        ];
    }

    // ── Ancestors / hiérarchie ───────────────────────────────────────────────

    /**
     * Obtenir les ancêtres d'un code (pour l'arborescence / breadcrumb).
     */
    public function getAncestors(string $codeOrUri): array
    {
        $entity = $this->lookup($codeOrUri);
        $ancestors = [];

        foreach ($entity['ancestors'] ?? [] as $ancestorUri) {
            try {
                $ancestors[] = $this->lookup($ancestorUri);
            } catch (\Exception $e) {
                continue;
            }
        }

        return $ancestors;
    }

    // ── Health check ─────────────────────────────────────────────────────────

    /**
     * Récupérer la racine de la linéarisation MMS (liste des chapitres).
     *
     * @return array{title: string, releaseId: string, children: string[]}
     */
    public function getLinearizationRoot(): array
    {
        $url = "{$this->apiBaseUrl}/icd/release/11/{$this->releaseId}/{$this->linearization}";
        $response = $this->apiRequest('GET', $url);

        return [
            'title' => $response['title']['@value'] ?? $response['title'] ?? null,
            'release_id' => $response['releaseId'] ?? null,
            'children' => $response['child'] ?? [],
        ];
    }

    /**
     * Récupérer le JSON brut d'une entité par son URI (chapitre, bloc, catégorie).
     */
    public function getEntityRaw(string $uri): array
    {
        $url = str_replace('http://', 'https://', $uri);
        return $this->apiRequest('GET', $url);
    }

    /**
     * Vérifier la connectivité avec l'API ICD-11.
     */
    public function healthCheck(): array
    {
        try {
            $token = $this->getAccessToken();
            $url = "{$this->apiBaseUrl}/icd/release/11/{$this->releaseId}/{$this->linearization}";
            $response = $this->apiRequest('GET', $url);

            return [
                'status' => 'ok',
                'api_version' => $this->apiVersion,
                'language' => $this->language,
                'release_id' => $response['releaseId'] ?? $response['title'] ?? null,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    // ── Helpers privés ───────────────────────────────────────────────────────

    private function apiRequest(string $method, string $url, array $params = []): array
    {
        $token = $this->getAccessToken();

        $request = Http::timeout($this->timeout)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'Accept' => 'application/json',
                'Accept-Language' => $this->language,
                'API-Version' => $this->apiVersion,
            ]);

        $response = $method === 'GET'
            ? $request->get($url, $params)
            : $request->post($url, $params);

        if (!$response->successful()) {
            // Invalider le token si 401
            if ($response->status() === 401) {
                Cache::forget('icd11_access_token');
            }

            throw new \RuntimeException(
                "ICD-11 API error [{$response->status()}]: " . substr($response->body(), 0, 200)
            );
        }

        return $response->json() ?? [];
    }

    private function parseSearchEntity(array $entity): array
    {
        $theCode = $entity['theCode'] ?? null;
        $title = strip_tags($entity['title'] ?? '');
        $stemId = $entity['stemId'] ?? null;

        // Score indiquant la pertinence (matching)
        $score = $entity['score'] ?? 0;

        // Déterminer si c'est une feuille terminale
        $isLeaf = $entity['isLeaf'] ?? false;

        return [
            'code' => $theCode,
            'title' => $title,
            'uri' => $stemId,
            'score' => $score,
            'is_leaf' => $isLeaf,
            'chapter' => $entity['chapter'] ?? null,
        ];
    }

    private function parseEntity(array $response): array
    {
        return [
            'code' => $response['code'] ?? $response['codeRange'] ?? null,
            'title' => $response['title']['@value'] ?? $response['title'] ?? null,
            'definition' => $response['definition']['@value'] ?? null,
            'uri' => $response['@id'] ?? null,
            'parent' => $response['parent'] ?? [],
            'ancestors' => $response['ancestor'] ?? [],
            'inclusions' => collect($response['inclusion'] ?? [])
                ->map(fn ($i) => $i['label']['@value'] ?? null)
                ->filter()
                ->values()
                ->all(),
            'exclusions' => collect($response['exclusion'] ?? [])
                ->map(fn ($e) => $e['label']['@value'] ?? null)
                ->filter()
                ->values()
                ->all(),
            'coding_note' => $response['codingNote']['@value'] ?? null,
            'block_id' => $response['blockId'] ?? null,
            'code_range' => $response['codeRange'] ?? null,
            'class_kind' => $response['classKind'] ?? null,
            'browser_url' => $response['browserUrl'] ?? null,
        ];
    }
}
