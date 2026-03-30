<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\Patient;
use App\Services\Cda\CdaR2Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Endpoints CDA R2 (Clinical Document Architecture Release 2).
 * Génère des documents cliniques XML conformes HL7 CDA® R2 / C-CDA 2.1.
 *
 * @group Interopérabilité — CDA R2
 */
class CdaController extends Controller
{
    private CdaR2Builder $builder;

    public function __construct(CdaR2Builder $builder)
    {
        $this->builder = $builder;
    }

    // ── CCD — Continuity of Care Document ────────────────────────────────────

    /**
     * Génère le CCD (Résumé de Soins Continu) d'un patient.
     *
     * GET /api/v1/cda/Patient/{id}/ccd
     */
    public function patientCcd(Request $request, int $id): Response
    {
        $patient = Patient::with('dossier')->findOrFail($id);

        $xml = $this->builder->buildCcd($patient);

        return $this->xmlResponse($xml, 'CCD_Patient_' . $id);
    }

    // ── Consultation Note ────────────────────────────────────────────────────

    /**
     * Génère un Compte-Rendu de Consultation CDA R2.
     *
     * GET /api/v1/cda/Consultation/{id}/note
     */
    public function consultationNote(Request $request, int $id): Response
    {
        $consultation = Consultation::findOrFail($id);

        $xml = $this->builder->buildConsultationNote($consultation);

        return $this->xmlResponse($xml, 'ConsultationNote_' . $id);
    }

    // ── Patient Summary (alias simplifié du CCD) ─────────────────────────────

    /**
     * Résumé patient (Patient Summary / IPS-like) en CDA R2.
     *
     * GET /api/v1/cda/Patient/{id}/summary
     */
    public function patientSummary(Request $request, int $id): Response
    {
        // Le CCD est le format standard pour un résumé patient
        return $this->patientCcd($request, $id);
    }

    // ── Validation basique ───────────────────────────────────────────────────

    /**
     * Valide un document CDA R2 envoyé en POST (vérification structurelle).
     *
     * POST /api/v1/cda/validate
     */
    public function validate(Request $request)
    {
        $request->validate([
            'document' => 'required|string',
        ]);

        $xmlContent = $request->input('document');

        $errors = [];
        $warnings = [];

        // Validation XML well-formed
        libxml_use_internal_errors(true);
        $dom = new \DOMDocument();

        if (!$dom->loadXML($xmlContent)) {
            foreach (libxml_get_errors() as $error) {
                $errors[] = [
                    'line' => $error->line,
                    'column' => $error->column,
                    'message' => trim($error->message),
                    'level' => $error->level === LIBXML_ERR_WARNING ? 'warning' : 'error',
                ];
            }
            libxml_clear_errors();
            libxml_use_internal_errors(false);

            return response()->json([
                'valid' => false,
                'errors' => $errors,
            ], 422);
        }

        libxml_clear_errors();
        libxml_use_internal_errors(false);

        // Vérifications structurelles CDA R2
        $root = $dom->documentElement;

        // Vérifier le namespace
        if ($root->namespaceURI !== 'urn:hl7-org:v3') {
            $errors[] = [
                'message' => 'Le namespace racine doit être urn:hl7-org:v3',
                'level' => 'error',
            ];
        }

        // Vérifier l'élément racine
        if ($root->localName !== 'ClinicalDocument') {
            $errors[] = [
                'message' => 'L\'élément racine doit être ClinicalDocument',
                'level' => 'error',
            ];
        }

        // Vérifier typeId CDA R2
        $typeId = $root->getElementsByTagName('typeId')->item(0);
        if (!$typeId) {
            $errors[] = ['message' => 'typeId manquant', 'level' => 'error'];
        } else {
            if ($typeId->getAttribute('root') !== '2.16.840.1.113883.1.3') {
                $errors[] = ['message' => 'typeId/@root invalide (attendu: 2.16.840.1.113883.1.3)', 'level' => 'error'];
            }
            if ($typeId->getAttribute('extension') !== 'POCD_HD000040') {
                $errors[] = ['message' => 'typeId/@extension invalide (attendu: POCD_HD000040)', 'level' => 'error'];
            }
        }

        // Vérifier les éléments obligatoires du header
        $requiredElements = ['id', 'code', 'title', 'effectiveTime', 'confidentialityCode', 'recordTarget', 'author', 'custodian'];
        foreach ($requiredElements as $el) {
            if ($root->getElementsByTagName($el)->length === 0) {
                $errors[] = ['message' => "Élément obligatoire manquant : {$el}", 'level' => 'error'];
            }
        }

        // Vérifier la présence du body
        $component = $root->getElementsByTagName('component');
        if ($component->length === 0) {
            $warnings[] = ['message' => 'Aucun component/structuredBody trouvé', 'level' => 'warning'];
        }

        // Comptage des sections
        $sections = $root->getElementsByTagName('section');
        $sectionCount = $sections->length;

        // Vérifier que chaque section a un code et un title
        for ($i = 0; $i < $sectionCount; $i++) {
            $sec = $sections->item($i);
            $secCode = null;
            $secTitle = null;
            foreach ($sec->childNodes as $child) {
                if ($child->nodeName === 'code') {
                    $secCode = $child;
                }
                if ($child->nodeName === 'title') {
                    $secTitle = $child;
                }
            }
            if (!$secCode) {
                $warnings[] = ['message' => "Section #{$i} : code manquant", 'level' => 'warning'];
            }
            if (!$secTitle) {
                $warnings[] = ['message' => "Section #{$i} : title manquant", 'level' => 'warning'];
            }
        }

        $isValid = empty($errors);

        return response()->json([
            'valid' => $isValid,
            'sections_count' => $sectionCount,
            'errors' => $errors,
            'warnings' => $warnings,
        ], $isValid ? 200 : 422);
    }

    // ── Metadata ─────────────────────────────────────────────────────────────

    /**
     * Décrit les capacités CDA R2 de la plateforme.
     *
     * GET /api/v1/cda/metadata (public, sans auth)
     */
    public function metadata()
    {
        return response()->json([
            'service' => 'TLM-BFA CDA R2 Document Service',
            'version' => '1.0.0',
            'standard' => 'HL7 CDA® Release 2.0',
            'implementation_guide' => 'C-CDA 2.1 (Consolidated CDA)',
            'supported_documents' => [
                [
                    'type' => 'CCD',
                    'name' => 'Continuity of Care Document',
                    'loinc' => '34133-9',
                    'template_id' => '2.16.840.1.113883.10.20.22.1.2',
                    'endpoint' => '/api/v1/cda/Patient/{id}/ccd',
                    'method' => 'GET',
                    'description' => 'Résumé de soins complet du patient incluant allergies, diagnostics, prescriptions, signes vitaux, antécédents, examens et consultations.',
                ],
                [
                    'type' => 'Consultation Note',
                    'name' => 'Compte-Rendu de Consultation',
                    'loinc' => '11488-4',
                    'template_id' => '2.16.840.1.113883.10.20.22.1.4',
                    'endpoint' => '/api/v1/cda/Consultation/{id}/note',
                    'method' => 'GET',
                    'description' => 'Document de consultation incluant motif, constantes vitales, diagnostics, prescriptions, examens, plan de traitement et conclusion.',
                ],
                [
                    'type' => 'Patient Summary',
                    'name' => 'Résumé Patient',
                    'loinc' => '34133-9',
                    'template_id' => '2.16.840.1.113883.10.20.22.1.2',
                    'endpoint' => '/api/v1/cda/Patient/{id}/summary',
                    'method' => 'GET',
                    'description' => 'Résumé patient (alias du CCD).',
                ],
            ],
            'sections' => [
                ['code' => '48765-2', 'name' => 'Allergies', 'system' => 'LOINC'],
                ['code' => '11450-4', 'name' => 'Problèmes / Diagnostics', 'system' => 'LOINC'],
                ['code' => '10160-0', 'name' => 'Traitements / Prescriptions', 'system' => 'LOINC'],
                ['code' => '8716-3', 'name' => 'Signes Vitaux', 'system' => 'LOINC'],
                ['code' => '30954-2', 'name' => 'Résultats d\'Examens', 'system' => 'LOINC'],
                ['code' => '11348-0', 'name' => 'Antécédents Personnels', 'system' => 'LOINC'],
                ['code' => '10157-6', 'name' => 'Antécédents Familiaux', 'system' => 'LOINC'],
                ['code' => '46240-8', 'name' => 'Consultations', 'system' => 'LOINC'],
                ['code' => '29299-5', 'name' => 'Motif de Consultation', 'system' => 'LOINC'],
                ['code' => '18776-5', 'name' => 'Conduite à Tenir', 'system' => 'LOINC'],
                ['code' => '51848-0', 'name' => 'Conclusion Médicale', 'system' => 'LOINC'],
            ],
            'code_systems' => [
                ['oid' => '2.16.840.1.113883.6.1', 'name' => 'LOINC'],
                ['oid' => '2.16.840.1.113883.6.96', 'name' => 'SNOMED CT'],
                ['oid' => '2.16.840.1.113883.6.3', 'name' => 'ICD-10'],
            ],
            'oid_root' => '2.16.854.1.1.1',
            'validation_endpoint' => '/api/v1/cda/validate',
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function xmlResponse(string $xml, string $filename): Response
    {
        return new Response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="' . $filename . '.xml"',
            'X-CDA-Version' => 'R2',
            'X-CDA-Implementation' => 'C-CDA 2.1',
        ]);
    }
}
