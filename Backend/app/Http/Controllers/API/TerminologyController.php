<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\AtcService;
use App\Services\SnomedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerminologyController extends Controller
{
    public function __construct(
        private SnomedService $snomed,
        private AtcService $atc,
    ) {}

    // ══════════════════════════════════════════════════════════════════════════
    //  SNOMED CT
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Recherche SNOMED CT par terme.
     * GET /api/v1/terminology/snomed/search?term=...&limit=20&semanticTag=disorder
     */
    public function snomedSearch(Request $request): JsonResponse
    {
        $request->validate([
            'term' => 'required|string|min:2|max:200',
            'limit' => 'integer|min:1|max:50',
            'semanticTag' => 'nullable|string|in:disorder,finding,procedure,substance,body structure,organism,qualifier value,observable entity,situation,event',
        ]);

        $result = $this->snomed->search(
            $request->input('term'),
            $request->integer('limit', 20),
            $request->input('semanticTag'),
        );

        return response()->json($result);
    }

    /**
     * Lookup SNOMED CT par concept ID.
     * GET /api/v1/terminology/snomed/lookup/{conceptId}
     */
    public function snomedLookup(string $conceptId): JsonResponse
    {
        $concept = $this->snomed->lookup($conceptId);

        if (!$concept) {
            return response()->json([
                'error' => 'Concept SNOMED CT non trouvé.',
                'conceptId' => $conceptId,
            ], 404);
        }

        return response()->json($concept);
    }

    /**
     * Validation d'un code SNOMED CT.
     * GET /api/v1/terminology/snomed/validate/{conceptId}
     */
    public function snomedValidate(string $conceptId): JsonResponse
    {
        return response()->json($this->snomed->validate($conceptId));
    }

    /**
     * Concepts enfants d'un concept SNOMED CT.
     * GET /api/v1/terminology/snomed/children/{conceptId}
     */
    public function snomedChildren(string $conceptId, Request $request): JsonResponse
    {
        $limit = $request->integer('limit', 50);
        return response()->json($this->snomed->children($conceptId, $limit));
    }

    /**
     * Recherches spécialisées SNOMED CT par domaine.
     * GET /api/v1/terminology/snomed/disorders?term=...
     * GET /api/v1/terminology/snomed/procedures?term=...
     * GET /api/v1/terminology/snomed/findings?term=...
     * GET /api/v1/terminology/snomed/substances?term=...
     */
    public function snomedDomain(string $domain, Request $request): JsonResponse
    {
        $request->validate([
            'term' => 'required|string|min:2|max:200',
            'limit' => 'integer|min:1|max:50',
        ]);

        $term = $request->input('term');
        $limit = $request->integer('limit', 20);

        $result = match ($domain) {
            'disorders' => $this->snomed->searchDisorders($term, $limit),
            'procedures' => $this->snomed->searchProcedures($term, $limit),
            'findings' => $this->snomed->searchFindings($term, $limit),
            'substances' => $this->snomed->searchSubstances($term, $limit),
            'body-structures' => $this->snomed->searchBodyStructures($term, $limit),
            default => ['items' => [], 'total' => 0],
        };

        return response()->json($result);
    }

    /**
     * Health check SNOMED.
     * GET /api/v1/terminology/snomed/health
     */
    public function snomedHealth(): JsonResponse
    {
        return response()->json($this->snomed->health());
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  ATC (Classification anatomique, thérapeutique et chimique)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Arbre ATC niveau 1.
     * GET /api/v1/terminology/atc/tree
     */
    public function atcTree(): JsonResponse
    {
        return response()->json($this->atc->tree());
    }

    /**
     * Recherche ATC par terme.
     * GET /api/v1/terminology/atc/search?term=...&limit=30
     */
    public function atcSearch(Request $request): JsonResponse
    {
        $request->validate([
            'term' => 'required|string|min:2|max:200',
            'limit' => 'integer|min:1|max:100',
        ]);

        return response()->json(
            $this->atc->search($request->input('term'), $request->integer('limit', 30))
        );
    }

    /**
     * Lookup ATC par code.
     * GET /api/v1/terminology/atc/lookup/{code}
     */
    public function atcLookup(string $code): JsonResponse
    {
        $result = $this->atc->lookup($code);

        if (!$result) {
            return response()->json([
                'error' => 'Code ATC non trouvé.',
                'code' => $code,
            ], 404);
        }

        return response()->json($result);
    }

    /**
     * Sous-groupes d'un code ATC.
     * GET /api/v1/terminology/atc/children/{code}
     */
    public function atcChildren(string $code): JsonResponse
    {
        return response()->json($this->atc->children($code));
    }

    /**
     * Validation d'un code ATC.
     * GET /api/v1/terminology/atc/validate/{code}
     */
    public function atcValidate(string $code): JsonResponse
    {
        return response()->json($this->atc->validate($code));
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  METADATA (capacités terminologiques)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Metadata : terminologies supportées.
     * GET /api/v1/terminology/metadata
     */
    public function metadata(): JsonResponse
    {
        return response()->json([
            'service' => 'TLM-BFA Terminology Service',
            'version' => '1.0.0',
            'terminologies' => [
                [
                    'name' => 'SNOMED CT',
                    'system' => 'http://snomed.info/sct',
                    'oid' => '2.16.840.1.113883.6.96',
                    'version' => 'International Edition',
                    'source' => 'Snowstorm Browser API (SNOMED International)',
                    'capabilities' => ['search', 'lookup', 'validate', 'children', 'domain-search'],
                    'domains' => ['disorders', 'procedures', 'findings', 'substances', 'body-structures'],
                ],
                [
                    'name' => 'ATC',
                    'fullName' => 'Anatomical Therapeutic Chemical Classification',
                    'system' => 'http://www.whocc.no/atc',
                    'oid' => '2.16.840.1.113883.6.73',
                    'version' => '2024',
                    'organization' => 'WHO Collaborating Centre for Drug Statistics',
                    'source' => 'Référentiel embarqué (niveaux 1-3)',
                    'capabilities' => ['tree', 'search', 'lookup', 'children', 'validate'],
                    'levels' => [
                        ['level' => 1, 'description' => 'Groupe anatomique principal', 'example' => 'J'],
                        ['level' => 2, 'description' => 'Sous-groupe thérapeutique', 'example' => 'J01'],
                        ['level' => 3, 'description' => 'Sous-groupe pharmacologique', 'example' => 'J01C'],
                    ],
                ],
                [
                    'name' => 'ICD-10',
                    'system' => 'http://hl7.org/fhir/sid/icd-10',
                    'oid' => '2.16.840.1.113883.6.3',
                    'status' => 'supported',
                    'note' => 'Via champs code_cim sur diagnostics/antécédents',
                ],
                [
                    'name' => 'ICD-11',
                    'system' => 'http://id.who.int/icd/release/11/mms',
                    'status' => 'supported',
                    'note' => 'Via service Icd11Controller (API OMS)',
                ],
                [
                    'name' => 'LOINC',
                    'system' => 'http://loinc.org',
                    'oid' => '2.16.840.1.113883.6.1',
                    'status' => 'supported',
                    'note' => 'Codage signes vitaux (Observation), sections CDA R2',
                ],
            ],
        ]);
    }
}
