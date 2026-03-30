<?php

namespace App\Services\Cda;

use App\Models\Allergie;
use App\Models\Antecedent;
use App\Models\Constante;
use App\Models\Consultation;
use App\Models\Diagnostic;
use App\Models\DossierPatient;
use App\Models\Examen;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Structure;
use App\Models\User;
use DOMDocument;
use DOMElement;

/**
 * Génère des documents CDA R2 (Clinical Document Architecture Release 2)
 * conformes à la norme HL7 CDA® R2 / IHE PCC.
 *
 * @see https://www.hl7.org/implement/standards/product_brief.cfm?product_id=7
 */
class CdaR2Builder
{
    // ── OID & Namespaces ─────────────────────────────────────────────────────

    private const CDA_NS = 'urn:hl7-org:v3';
    private const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
    private const SCHEMA_LOC = 'urn:hl7-org:v3 CDA.xsd';

    // OID racine TLM-BFA (basé sur code ISO 854 = Burkina Faso)
    private const OID_ROOT = '2.16.854.1.1.1';
    private const OID_PATIENTS = '2.16.854.1.1.1.1';
    private const OID_PRACTITIONERS = '2.16.854.1.1.1.2';
    private const OID_STRUCTURES = '2.16.854.1.1.1.3';
    private const OID_DOCUMENTS = '2.16.854.1.1.1.4';

    // Code systems standards
    private const OID_LOINC = '2.16.840.1.113883.6.1';
    private const OID_SNOMED = '2.16.840.1.113883.6.96';
    private const OID_ICD10 = '2.16.840.1.113883.6.3';
    private const OID_HL7_CONF = '2.16.840.1.113883.5.25';
    private const OID_HL7_ACTCODE = '2.16.840.1.113883.5.4';

    // Template IDs (C-CDA 2.1 / IHE PCC)
    private const TPL_CCD = '2.16.840.1.113883.10.20.22.1.2';
    private const TPL_CONSULTATION_NOTE = '2.16.840.1.113883.10.20.22.1.4';
    private const TPL_PROGRESS_NOTE = '2.16.840.1.113883.10.20.22.1.9';
    private const TPL_ALLERGIES_SECTION = '2.16.840.1.113883.10.20.22.2.6.1';
    private const TPL_PROBLEMS_SECTION = '2.16.840.1.113883.10.20.22.2.5.1';
    private const TPL_MEDICATIONS_SECTION = '2.16.840.1.113883.10.20.22.2.1.1';
    private const TPL_VITALSIGNS_SECTION = '2.16.840.1.113883.10.20.22.2.4.1';
    private const TPL_RESULTS_SECTION = '2.16.840.1.113883.10.20.22.2.3.1';
    private const TPL_ENCOUNTERS_SECTION = '2.16.840.1.113883.10.20.22.2.22.1';
    private const TPL_PLAN_SECTION = '2.16.840.1.113883.10.20.22.2.10';
    private const TPL_HISTORY_SECTION = '2.16.840.1.113883.10.20.22.2.20';
    private const TPL_FAMILY_HISTORY_SECTION = '2.16.840.1.113883.10.20.22.2.15';

    private DOMDocument $dom;

    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Génère un CCD (Continuity of Care Document) complet pour un patient.
     */
    public function buildCcd(Patient $patient): string
    {
        $patient->load([
            'dossier.consultations.user',
            'dossier.diagnostics',
            'dossier.prescriptions',
            'dossier.examens',
            'dossier.antecedents',
            'dossier.allergies',
            'dossier.constantes',
            'structure',
            'localite.pays',
        ]);

        $dossier = $patient->dossier;
        $structure = $patient->structure;
        $author = $dossier?->consultations?->last()?->user;

        $this->initDocument();
        $root = $this->createRoot();

        // templateId CCD
        $this->addTemplateId($root, self::TPL_CCD);

        // Document id
        $this->addId($root, self::OID_DOCUMENTS, 'CCD-' . ($patient->id ?? 'unknown') . '-' . now()->format('YmdHis'));

        // Type du document : CCD (LOINC 34133-9)
        $this->addCode($root, self::OID_LOINC, '34133-9', 'Summarization of Episode Note', 'LOINC');

        $this->addElement($root, 'title', 'Résumé de Soins Continu (CCD) — ' . ($patient->nom ?? '') . ' ' . ($patient->prenoms ?? ''));
        $this->addEffectiveTime($root, now());
        $this->addConfidentialityCode($root, 'N'); // Normal

        $this->addElement($root, 'languageCode', null, ['code' => 'fr-BF']);

        // ── Header ──
        $this->addRecordTarget($root, $patient);

        if ($author) {
            $this->addAuthor($root, $author);
        } else {
            $this->addAuthorDevice($root);
        }

        $this->addCustodian($root, $structure);

        // ── Body ──
        $body = $this->addStructuredBody($root);

        // Sections cliniques
        if ($dossier) {
            if ($dossier->allergies->isNotEmpty()) {
                $this->addAllergiesSection($body, $dossier->allergies);
            }

            $diagnostics = $dossier->diagnostics;
            if ($diagnostics->isNotEmpty()) {
                $this->addProblemsSection($body, $diagnostics);
            }

            if ($dossier->prescriptions->isNotEmpty()) {
                $this->addMedicationsSection($body, $dossier->prescriptions);
            }

            $constantes = $dossier->constantes;
            if ($constantes->isNotEmpty()) {
                $this->addVitalSignsSection($body, $constantes);
            }

            if ($dossier->examens->isNotEmpty()) {
                $this->addResultsSection($body, $dossier->examens);
            }

            $antecedents = $dossier->antecedents;
            $personal = $antecedents->filter(fn ($a) => !str_contains(strtolower($a->type ?? ''), 'famil'));
            $family = $antecedents->filter(fn ($a) => str_contains(strtolower($a->type ?? ''), 'famil'));

            if ($personal->isNotEmpty()) {
                $this->addHistorySection($body, $personal);
            }
            if ($family->isNotEmpty()) {
                $this->addFamilyHistorySection($body, $family);
            }

            if ($dossier->consultations->isNotEmpty()) {
                $this->addEncountersSection($body, $dossier->consultations);
            }
        }

        return $this->render();
    }

    /**
     * Génère un Compte-rendu de Consultation CDA R2.
     */
    public function buildConsultationNote(Consultation $consultation): string
    {
        $consultation->load([
            'dossierPatient.patient.localite.pays',
            'dossierPatient.patient.structure',
            'user.structure',
            'diagnostics',
            'prescriptions',
            'examens',
        ]);

        $patient = $consultation->dossierPatient?->patient;
        $author = $consultation->user;

        // Constantes liées à cette consultation
        $constantes = \App\Models\Constante::where('consultation_id', $consultation->id)->get();
        $structure = $author?->structure ?? $patient?->structure;

        $this->initDocument();
        $root = $this->createRoot();

        // templateId Consultation Note
        $this->addTemplateId($root, self::TPL_CONSULTATION_NOTE);

        $this->addId($root, self::OID_DOCUMENTS, 'CN-' . $consultation->id . '-' . now()->format('YmdHis'));

        // LOINC 11488-4 = Consultation Note
        $this->addCode($root, self::OID_LOINC, '11488-4', 'Consultation Note', 'LOINC');

        $title = 'Compte-Rendu de Consultation';
        if ($consultation->type === 'teleconsultation') {
            $title = 'Compte-Rendu de Téléconsultation';
        }
        $this->addElement($root, 'title', $title . ' — ' . ($patient->nom ?? '') . ' ' . ($patient->prenoms ?? ''));

        $this->addEffectiveTime($root, $consultation->date ?? now());
        $this->addConfidentialityCode($root, 'N');
        $this->addElement($root, 'languageCode', null, ['code' => 'fr-BF']);

        // ── Header ──
        if ($patient) {
            $this->addRecordTarget($root, $patient);
        }
        if ($author) {
            $this->addAuthor($root, $author);
        } else {
            $this->addAuthorDevice($root);
        }
        $this->addCustodian($root, $structure);

        // componentOf — encompassingEncounter
        $this->addEncompassingEncounter($root, $consultation);

        // ── Body ──
        $body = $this->addStructuredBody($root);

        // Motif + Histoire de la maladie
        $this->addReasonSection($body, $consultation);

        // Constantes vitales
        if ($constantes->isNotEmpty()) {
            $this->addVitalSignsSection($body, $constantes);
        }

        // Diagnostics / Problèmes actifs
        if ($consultation->diagnostics->isNotEmpty()) {
            $this->addProblemsSection($body, $consultation->diagnostics);
        }

        // Prescriptions
        if ($consultation->prescriptions->isNotEmpty()) {
            $this->addMedicationsSection($body, $consultation->prescriptions);
        }

        // Examens complémentaires
        if ($consultation->examens->isNotEmpty()) {
            $this->addResultsSection($body, $consultation->examens);
        }

        // Plan (conduite à tenir)
        if ($consultation->conduite_a_tenir) {
            $this->addPlanSection($body, $consultation);
        }

        // Conclusion
        if ($consultation->conclusion_medicale) {
            $this->addAssessmentSection($body, $consultation);
        }

        return $this->render();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DOCUMENT INIT
    // ══════════════════════════════════════════════════════════════════════════

    private function initDocument(): void
    {
        $this->dom = new DOMDocument('1.0', 'UTF-8');
        $this->dom->formatOutput = true;
    }

    private function createRoot(): DOMElement
    {
        $root = $this->dom->createElementNS(self::CDA_NS, 'ClinicalDocument');
        $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xsi', self::XSI_NS);
        $root->setAttribute('xsi:schemaLocation', self::SCHEMA_LOC);
        $this->dom->appendChild($root);

        // typeId — fixe pour CDA R2
        $typeId = $this->ce($root, 'typeId');
        $typeId->setAttribute('root', '2.16.840.1.113883.1.3');
        $typeId->setAttribute('extension', 'POCD_HD000040');

        return $root;
    }

    private function render(): string
    {
        $xml = $this->dom->saveXML();

        // Ajout du stylesheet processing instruction en tête
        $pi = '<?xml-stylesheet type="text/xsl" href="CDA.xsl"?>';

        return str_replace(
            '?>' . "\n" . '<ClinicalDocument',
            '?>' . "\n" . $pi . "\n" . '<ClinicalDocument',
            $xml
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HEADER BUILDING
    // ══════════════════════════════════════════════════════════════════════════

    private function addRecordTarget(DOMElement $parent, Patient $patient): void
    {
        $rt = $this->ce($parent, 'recordTarget');
        $pr = $this->ce($rt, 'patientRole');

        // Identifier : MRN du dossier
        if ($patient->dossier) {
            $this->addIdElement($pr, self::OID_PATIENTS, $patient->dossier->identifiant);
        }

        // Adresse
        $addr = $this->ce($pr, 'addr');
        $addr->setAttribute('use', 'HP');
        if ($localite = $patient->localite) {
            if ($localite->commune) {
                $this->addElement($addr, 'city', $localite->commune);
            }
            if ($localite->province) {
                $this->addElement($addr, 'state', $localite->province);
            }
            if ($localite->pays) {
                $this->addElement($addr, 'country', $localite->pays->nom ?? 'Burkina Faso');
            }
        }

        // Télécom
        if ($patient->telephone_1) {
            $tel = $this->ce($pr, 'telecom');
            $tel->setAttribute('value', 'tel:' . $patient->telephone_1);
            $tel->setAttribute('use', 'HP');
        }
        if ($patient->email) {
            $tel = $this->ce($pr, 'telecom');
            $tel->setAttribute('value', 'mailto:' . $patient->email);
        }

        // Patient demographics
        $ptNode = $this->ce($pr, 'patient');

        $name = $this->ce($ptNode, 'name');
        $name->setAttribute('use', 'L');
        $this->addElement($name, 'family', $patient->nom ?? '');
        $this->addElement($name, 'given', $patient->prenoms ?? '');

        $gender = $this->ce($ptNode, 'administrativeGenderCode');
        $genderMap = ['M' => 'M', 'F' => 'F', 'masculin' => 'M', 'feminin' => 'F'];
        $genderCode = $genderMap[$patient->sexe] ?? 'UN';
        $gender->setAttribute('code', $genderCode);
        $gender->setAttribute('codeSystem', '2.16.840.1.113883.5.1');
        $gender->setAttribute('displayName', $genderCode === 'M' ? 'Male' : ($genderCode === 'F' ? 'Female' : 'Undifferentiated'));

        if ($patient->date_naissance) {
            $bd = $this->ce($ptNode, 'birthTime');
            $bd->setAttribute('value', $patient->date_naissance->format('Ymd'));
        }
    }

    private function addAuthor(DOMElement $parent, User $user): void
    {
        $author = $this->ce($parent, 'author');

        $time = $this->ce($author, 'time');
        $time->setAttribute('value', now()->format('YmdHis'));

        $assigned = $this->ce($author, 'assignedAuthor');
        $this->addIdElement($assigned, self::OID_PRACTITIONERS, (string) $user->id);

        if ($user->specialite) {
            $code = $this->ce($assigned, 'code');
            $code->setAttribute('code', $user->specialite);
            $code->setAttribute('codeSystem', self::OID_ROOT);
            $code->setAttribute('displayName', $user->specialite);
        }

        $addr = $this->ce($assigned, 'addr');
        $this->addElement($addr, 'country', 'Burkina Faso');

        if ($user->telephone_1) {
            $tel = $this->ce($assigned, 'telecom');
            $tel->setAttribute('value', 'tel:' . $user->telephone_1);
        }

        $person = $this->ce($assigned, 'assignedPerson');
        $name = $this->ce($person, 'name');
        $this->addElement($name, 'prefix', 'Dr');
        $this->addElement($name, 'family', $user->nom ?? '');
        $this->addElement($name, 'given', $user->prenoms ?? '');

        // Organisation de l'auteur
        if ($user->structure) {
            $org = $this->ce($assigned, 'representedOrganization');
            $this->addIdElement($org, self::OID_STRUCTURES, (string) $user->structure->id);
            $this->addElement($org, 'name', $user->structure->libelle ?? '');

            if ($user->structure->telephone) {
                $tel = $this->ce($org, 'telecom');
                $tel->setAttribute('value', 'tel:' . $user->structure->telephone);
            }
        }
    }

    /**
     * Auteur système (quand aucun praticien n'est identifié).
     */
    private function addAuthorDevice(DOMElement $parent): void
    {
        $author = $this->ce($parent, 'author');

        $time = $this->ce($author, 'time');
        $time->setAttribute('value', now()->format('YmdHis'));

        $assigned = $this->ce($author, 'assignedAuthor');
        $this->addIdElement($assigned, self::OID_ROOT, 'TLM-BFA-SYSTEM');

        $device = $this->ce($assigned, 'assignedAuthoringDevice');
        $this->addElement($device, 'manufacturerModelName', 'TLM-BFA');
        $this->addElement($device, 'softwareName', 'TLM-BFA Plateforme de Télémédecine');
    }

    private function addCustodian(DOMElement $parent, ?Structure $structure): void
    {
        $custodian = $this->ce($parent, 'custodian');
        $assigned = $this->ce($custodian, 'assignedCustodian');
        $org = $this->ce($assigned, 'representedCustodianOrganization');

        if ($structure) {
            $this->addIdElement($org, self::OID_STRUCTURES, (string) $structure->id);
            $this->addElement($org, 'name', $structure->libelle ?? 'TLM-BFA');

            if ($structure->telephone) {
                $tel = $this->ce($org, 'telecom');
                $tel->setAttribute('value', 'tel:' . $structure->telephone);
            }
        } else {
            $this->addIdElement($org, self::OID_ROOT, 'TLM-BFA');
            $this->addElement($org, 'name', 'TLM-BFA — Plateforme de Télémédecine');
        }

        $addr = $this->ce($org, 'addr');
        $this->addElement($addr, 'city', 'Ouagadougou');
        $this->addElement($addr, 'country', 'Burkina Faso');
    }

    /**
     * encompassingEncounter pour un Compte-Rendu de Consultation.
     */
    private function addEncompassingEncounter(DOMElement $parent, Consultation $consultation): void
    {
        $compOf = $this->ce($parent, 'componentOf');
        $enc = $this->ce($compOf, 'encompassingEncounter');

        $this->addIdElement($enc, self::OID_DOCUMENTS, 'ENC-' . $consultation->id);

        $code = $this->ce($enc, 'code');
        if ($consultation->type === 'teleconsultation') {
            $code->setAttribute('code', 'VR');
            $code->setAttribute('displayName', 'virtual');
        } else {
            $code->setAttribute('code', 'AMB');
            $code->setAttribute('displayName', 'ambulatory');
        }
        $code->setAttribute('codeSystem', self::OID_HL7_ACTCODE);

        $effectiveTime = $this->ce($enc, 'effectiveTime');
        if ($consultation->date) {
            $low = $this->ce($effectiveTime, 'low');
            $low->setAttribute('value', \Carbon\Carbon::parse($consultation->date)->format('YmdHis'));
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BODY SECTIONS
    // ══════════════════════════════════════════════════════════════════════════

    private function addStructuredBody(DOMElement $root): DOMElement
    {
        $component = $this->ce($root, 'component');
        return $this->ce($component, 'structuredBody');
    }

    // ── Allergies ────────────────────────────────────────────────────────────

    private function addAllergiesSection(DOMElement $body, $allergies): void
    {
        $section = $this->createSection($body, self::TPL_ALLERGIES_SECTION, self::OID_LOINC, '48765-2', 'Allergies and adverse reactions Document', 'Allergies');

        // Narrative block
        $text = $this->ce($section, 'text');
        $table = $this->ce($text, 'table');
        $thead = $this->ce($table, 'thead');
        $tr = $this->ce($thead, 'tr');
        $this->addElement($tr, 'th', 'Allergène');
        $this->addElement($tr, 'th', 'Manifestation');
        $this->addElement($tr, 'th', 'Sévérité');

        $tbody = $this->ce($table, 'tbody');
        foreach ($allergies as $allergie) {
            $tr = $this->ce($tbody, 'tr');
            $this->addElement($tr, 'td', $allergie->allergenes ?? '');
            $this->addElement($tr, 'td', $allergie->manifestations ?? '');
            $this->addElement($tr, 'td', $allergie->severite ?? '');

            // Structured entry
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $act = $this->ce($entry, 'act');
            $act->setAttribute('classCode', 'ACT');
            $act->setAttribute('moodCode', 'EVN');

            $this->addTemplateId($act, '2.16.840.1.113883.10.20.22.4.30');
            $this->addIdElement($act, self::OID_ROOT, 'allergy-' . $allergie->id);

            $statusCode = $this->ce($act, 'statusCode');
            $statusCode->setAttribute('code', 'active');

            // Observation d'allergie
            $entryRel = $this->ce($act, 'entryRelationship');
            $entryRel->setAttribute('typeCode', 'SUBJ');
            $obs = $this->ce($entryRel, 'observation');
            $obs->setAttribute('classCode', 'OBS');
            $obs->setAttribute('moodCode', 'EVN');

            $this->addTemplateId($obs, '2.16.840.1.113883.10.20.22.4.7');

            $obsCode = $this->ce($obs, 'code');
            $obsCode->setAttribute('code', 'ASSERTION');
            $obsCode->setAttribute('codeSystem', self::OID_HL7_ACTCODE);

            $val = $this->ce($obs, 'value');
            $val->setAttribute('xsi:type', 'CD');
            $val->setAttribute('displayName', $allergie->allergenes ?? '');
            $val->setAttribute('codeSystem', self::OID_SNOMED);

            // Sévérité
            if ($allergie->severite) {
                $sevRel = $this->ce($obs, 'entryRelationship');
                $sevRel->setAttribute('typeCode', 'SUBJ');
                $sevObs = $this->ce($sevRel, 'observation');
                $sevObs->setAttribute('classCode', 'OBS');
                $sevObs->setAttribute('moodCode', 'EVN');
                $this->addTemplateId($sevObs, '2.16.840.1.113883.10.20.22.4.8');

                $sevCode = $this->ce($sevObs, 'code');
                $sevCode->setAttribute('code', 'SEV');
                $sevCode->setAttribute('codeSystem', self::OID_HL7_ACTCODE);

                $sevVal = $this->ce($sevObs, 'value');
                $sevVal->setAttribute('xsi:type', 'CD');
                $sevVal->setAttribute('codeSystem', self::OID_SNOMED);
                $sevMap = [
                    'legere' => ['code' => '255604002', 'display' => 'Mild'],
                    'légère' => ['code' => '255604002', 'display' => 'Mild'],
                    'moderee' => ['code' => '6736007', 'display' => 'Moderate'],
                    'modérée' => ['code' => '6736007', 'display' => 'Moderate'],
                    'severe' => ['code' => '24484000', 'display' => 'Severe'],
                    'sévère' => ['code' => '24484000', 'display' => 'Severe'],
                ];
                $sev = $sevMap[strtolower($allergie->severite)] ?? null;
                if ($sev) {
                    $sevVal->setAttribute('code', $sev['code']);
                    $sevVal->setAttribute('displayName', $sev['display']);
                }
            }
        }
    }

    // ── Problems / Diagnostics ───────────────────────────────────────────────

    private function addProblemsSection(DOMElement $body, $diagnostics): void
    {
        $section = $this->createSection($body, self::TPL_PROBLEMS_SECTION, self::OID_LOINC, '11450-4', 'Problem list - Reported', 'Problèmes / Diagnostics');

        $text = $this->ce($section, 'text');
        $table = $this->ce($text, 'table');
        $thead = $this->ce($table, 'thead');
        $tr = $this->ce($thead, 'tr');
        $this->addElement($tr, 'th', 'Diagnostic');
        $this->addElement($tr, 'th', 'Code CIM-10');
        $this->addElement($tr, 'th', 'Gravité');
        $this->addElement($tr, 'th', 'Statut');

        $tbody = $this->ce($table, 'tbody');
        foreach ($diagnostics as $diag) {
            $tr = $this->ce($tbody, 'tr');
            $this->addElement($tr, 'td', $diag->libelle ?? '');
            $this->addElement($tr, 'td', $diag->code_cim ?? '—');
            $this->addElement($tr, 'td', $diag->gravite ?? '');
            $this->addElement($tr, 'td', $diag->statut ?? '');

            // Structured entry
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $act = $this->ce($entry, 'act');
            $act->setAttribute('classCode', 'ACT');
            $act->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($act, '2.16.840.1.113883.10.20.22.4.3');
            $this->addIdElement($act, self::OID_ROOT, 'diag-' . $diag->id);

            $actCode = $this->ce($act, 'code');
            $actCode->setAttribute('code', 'CONC');
            $actCode->setAttribute('codeSystem', self::OID_HL7_ACTCODE);

            $statusCode = $this->ce($act, 'statusCode');
            $statusCode->setAttribute('code', $diag->statut === 'resolu' ? 'completed' : 'active');

            // Observation
            $entryRel = $this->ce($act, 'entryRelationship');
            $entryRel->setAttribute('typeCode', 'SUBJ');
            $obs = $this->ce($entryRel, 'observation');
            $obs->setAttribute('classCode', 'OBS');
            $obs->setAttribute('moodCode', 'EVN');

            $this->addTemplateId($obs, '2.16.840.1.113883.10.20.22.4.4');
            $this->addIdElement($obs, self::OID_ROOT, 'diag-obs-' . $diag->id);

            $obsCode = $this->ce($obs, 'code');
            $obsCode->setAttribute('code', '29308-4');
            $obsCode->setAttribute('codeSystem', self::OID_LOINC);
            $obsCode->setAttribute('displayName', 'Diagnosis');

            $val = $this->ce($obs, 'value');
            $val->setAttribute('xsi:type', 'CD');
            $val->setAttribute('displayName', $diag->libelle ?? '');

            if ($diag->snomed_code) {
                $val->setAttribute('code', $diag->snomed_code);
                $val->setAttribute('codeSystem', self::OID_SNOMED);
                $val->setAttribute('codeSystemName', 'SNOMED CT');
                // Ajouter ICD-10 en translation si disponible
                if ($diag->code_cim) {
                    $tr = $this->ce($val, 'translation');
                    $tr->setAttribute('code', $diag->code_cim);
                    $tr->setAttribute('codeSystem', self::OID_ICD10);
                    $tr->setAttribute('codeSystemName', 'ICD-10');
                    $tr->setAttribute('displayName', $diag->libelle ?? '');
                }
            } elseif ($diag->code_cim) {
                $val->setAttribute('code', $diag->code_cim);
                $val->setAttribute('codeSystem', self::OID_ICD10);
                $val->setAttribute('codeSystemName', 'ICD-10');
            } else {
                $val->setAttribute('codeSystem', self::OID_ROOT);
            }
        }
    }

    // ── Medications / Prescriptions ──────────────────────────────────────────

    private function addMedicationsSection(DOMElement $body, $prescriptions): void
    {
        $section = $this->createSection($body, self::TPL_MEDICATIONS_SECTION, self::OID_LOINC, '10160-0', 'History of Medication use Narrative', 'Traitements / Prescriptions');

        $text = $this->ce($section, 'text');
        $table = $this->ce($text, 'table');
        $thead = $this->ce($table, 'thead');
        $tr = $this->ce($thead, 'tr');
        $this->addElement($tr, 'th', 'Médicament');
        $this->addElement($tr, 'th', 'Posologie');
        $this->addElement($tr, 'th', 'Durée (jours)');
        $this->addElement($tr, 'th', 'Statut');

        $tbody = $this->ce($table, 'tbody');
        foreach ($prescriptions as $rx) {
            $tr = $this->ce($tbody, 'tr');
            $this->addElement($tr, 'td', $rx->denomination ?? '');
            $this->addElement($tr, 'td', $rx->posologie ?? '');
            $this->addElement($tr, 'td', (string) ($rx->duree_jours ?? ''));
            $this->addElement($tr, 'td', $rx->statut ?? '');

            // Structured entry
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $sa = $this->ce($entry, 'substanceAdministration');
            $sa->setAttribute('classCode', 'SBADM');
            $sa->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($sa, '2.16.840.1.113883.10.20.22.4.16');
            $this->addIdElement($sa, self::OID_ROOT, 'rx-' . $rx->id);

            $statusCode = $this->ce($sa, 'statusCode');
            $statusMap = ['active' => 'active', 'en_cours' => 'active', 'terminee' => 'completed', 'annulee' => 'aborted'];
            $statusCode->setAttribute('code', $statusMap[$rx->statut] ?? 'active');

            // Période
            $effectiveTime = $this->ce($sa, 'effectiveTime');
            $effectiveTime->setAttribute('xsi:type', 'IVL_TS');
            if ($rx->date_debut) {
                $low = $this->ce($effectiveTime, 'low');
                $low->setAttribute('value', \Carbon\Carbon::parse($rx->date_debut)->format('Ymd'));
            }
            if ($rx->date_fin) {
                $high = $this->ce($effectiveTime, 'high');
                $high->setAttribute('value', \Carbon\Carbon::parse($rx->date_fin)->format('Ymd'));
            }

            // Dose (texte libre)
            if ($rx->posologie) {
                $doseQty = $this->ce($sa, 'doseQuantity');
                $doseQty->setAttribute('value', '1');
                $doseQty->setAttribute('unit', '1');

                $text2 = $this->ce($sa, 'text');
                $this->addElement($text2, 'reference', null, ['value' => '#rx-' . $rx->id]);
            }

            // Consumable (médicament)
            $consumable = $this->ce($sa, 'consumable');
            $mfProduct = $this->ce($consumable, 'manufacturedProduct');
            $mfProduct->setAttribute('classCode', 'MANU');
            $this->addTemplateId($mfProduct, '2.16.840.1.113883.10.20.22.4.23');

            $mfMat = $this->ce($mfProduct, 'manufacturedMaterial');
            $matCode = $this->ce($mfMat, 'code');
            $matCode->setAttribute('displayName', $rx->denomination ?? '');

            if ($rx->atc_code) {
                $matCode->setAttribute('code', $rx->atc_code);
                $matCode->setAttribute('codeSystem', '2.16.840.1.113883.6.73');
                $matCode->setAttribute('codeSystemName', 'ATC');
                // Ajouter SNOMED en translation si disponible
                if ($rx->snomed_code) {
                    $tr = $this->ce($matCode, 'translation');
                    $tr->setAttribute('code', $rx->snomed_code);
                    $tr->setAttribute('codeSystem', self::OID_SNOMED);
                    $tr->setAttribute('codeSystemName', 'SNOMED CT');
                    $tr->setAttribute('displayName', $rx->snomed_display ?? $rx->denomination ?? '');
                }
            } elseif ($rx->snomed_code) {
                $matCode->setAttribute('code', $rx->snomed_code);
                $matCode->setAttribute('codeSystem', self::OID_SNOMED);
                $matCode->setAttribute('codeSystemName', 'SNOMED CT');
            } else {
                $matCode->setAttribute('codeSystem', self::OID_ROOT);
            }

            // Instructions
            if ($rx->instructions) {
                $entryRel = $this->ce($sa, 'entryRelationship');
                $entryRel->setAttribute('typeCode', 'SUBJ');
                $instAct = $this->ce($entryRel, 'act');
                $instAct->setAttribute('classCode', 'ACT');
                $instAct->setAttribute('moodCode', 'INT');
                $this->addTemplateId($instAct, '2.16.840.1.113883.10.20.22.4.20');
                $instCode = $this->ce($instAct, 'code');
                $instCode->setAttribute('code', '409073007');
                $instCode->setAttribute('codeSystem', self::OID_SNOMED);
                $instCode->setAttribute('displayName', 'Instruction');
                $instText = $this->ce($instAct, 'text');
                $instText->appendChild($this->dom->createTextNode($rx->instructions));
            }
        }
    }

    // ── Vital Signs ──────────────────────────────────────────────────────────

    private function addVitalSignsSection(DOMElement $body, $constantes): void
    {
        $section = $this->createSection($body, self::TPL_VITALSIGNS_SECTION, self::OID_LOINC, '8716-3', 'Vital signs', 'Signes Vitaux');

        $loincMap = [
            'poids' => ['29463-7', 'Body weight', 'kg'],
            'taille' => ['8302-2', 'Body height', 'cm'],
            'imc' => ['39156-5', 'Body mass index', 'kg/m2'],
            'temperature' => ['8310-5', 'Body temperature', 'Cel'],
            'tension_systolique' => ['8480-6', 'Systolic blood pressure', 'mm[Hg]'],
            'tension_diastolique' => ['8462-4', 'Diastolic blood pressure', 'mm[Hg]'],
            'frequence_cardiaque' => ['8867-4', 'Heart rate', '/min'],
            'frequence_respiratoire' => ['9279-1', 'Respiratory rate', '/min'],
            'saturation_o2' => ['2708-6', 'Oxygen saturation', '%'],
            'glycemie' => ['2339-0', 'Glucose', 'g/L'],
        ];

        $labelMap = [
            'poids' => 'Poids',
            'taille' => 'Taille',
            'imc' => 'IMC',
            'temperature' => 'Température',
            'tension_systolique' => 'TA Systolique',
            'tension_diastolique' => 'TA Diastolique',
            'frequence_cardiaque' => 'Fréquence cardiaque',
            'frequence_respiratoire' => 'Fréquence respiratoire',
            'saturation_o2' => 'SpO₂',
            'glycemie' => 'Glycémie',
        ];

        // Narrative
        $text = $this->ce($section, 'text');
        $table = $this->ce($text, 'table');
        $thead = $this->ce($table, 'thead');
        $tr = $this->ce($thead, 'tr');
        $this->addElement($tr, 'th', 'Date');
        $this->addElement($tr, 'th', 'Signe vital');
        $this->addElement($tr, 'th', 'Valeur');
        $this->addElement($tr, 'th', 'Unité');

        $tbody = $this->ce($table, 'tbody');

        foreach ($constantes as $constante) {
            $dateStr = $constante->created_at?->format('d/m/Y H:i') ?? '';

            // Organizer entry (un par relevé)
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $organizer = $this->ce($entry, 'organizer');
            $organizer->setAttribute('classCode', 'CLUSTER');
            $organizer->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($organizer, '2.16.840.1.113883.10.20.22.4.26');
            $this->addIdElement($organizer, self::OID_ROOT, 'vs-' . $constante->id);

            $orgCode = $this->ce($organizer, 'code');
            $orgCode->setAttribute('code', '46680-5');
            $orgCode->setAttribute('codeSystem', self::OID_LOINC);
            $orgCode->setAttribute('displayName', 'Vital signs');

            $statusCode = $this->ce($organizer, 'statusCode');
            $statusCode->setAttribute('code', 'completed');

            if ($constante->created_at) {
                $effectiveTime = $this->ce($organizer, 'effectiveTime');
                $effectiveTime->setAttribute('value', $constante->created_at->format('YmdHis'));
            }

            foreach ($loincMap as $field => [$loinc, $display, $unit]) {
                $val = $constante->$field;
                if ($val === null) {
                    continue;
                }

                // Narrative row
                $tr = $this->ce($tbody, 'tr');
                $this->addElement($tr, 'td', $dateStr);
                $this->addElement($tr, 'td', $labelMap[$field] ?? $field);
                $this->addElement($tr, 'td', (string) $val);
                $this->addElement($tr, 'td', $unit);

                // Component observation
                $comp = $this->ce($organizer, 'component');
                $obs = $this->ce($comp, 'observation');
                $obs->setAttribute('classCode', 'OBS');
                $obs->setAttribute('moodCode', 'EVN');
                $this->addTemplateId($obs, '2.16.840.1.113883.10.20.22.4.27');
                $this->addIdElement($obs, self::OID_ROOT, 'vs-' . $constante->id . '-' . $field);

                $obsCode = $this->ce($obs, 'code');
                $obsCode->setAttribute('code', $loinc);
                $obsCode->setAttribute('codeSystem', self::OID_LOINC);
                $obsCode->setAttribute('displayName', $display);

                $obsStatus = $this->ce($obs, 'statusCode');
                $obsStatus->setAttribute('code', 'completed');

                if ($constante->created_at) {
                    $et = $this->ce($obs, 'effectiveTime');
                    $et->setAttribute('value', $constante->created_at->format('YmdHis'));
                }

                $obsVal = $this->ce($obs, 'value');
                $obsVal->setAttribute('xsi:type', 'PQ');
                $obsVal->setAttribute('value', (string) $val);
                $obsVal->setAttribute('unit', $unit);
            }
        }
    }

    // ── Results / Examens ────────────────────────────────────────────────────

    private function addResultsSection(DOMElement $body, $examens): void
    {
        $section = $this->createSection($body, self::TPL_RESULTS_SECTION, self::OID_LOINC, '30954-2', 'Relevant diagnostic tests/laboratory data Narrative', 'Résultats d\'Examens');

        $text = $this->ce($section, 'text');
        $table = $this->ce($text, 'table');
        $thead = $this->ce($table, 'thead');
        $tr = $this->ce($thead, 'tr');
        $this->addElement($tr, 'th', 'Examen');
        $this->addElement($tr, 'th', 'Date');
        $this->addElement($tr, 'th', 'Résultat');
        $this->addElement($tr, 'th', 'Statut');

        $tbody = $this->ce($table, 'tbody');
        foreach ($examens as $examen) {
            $tr = $this->ce($tbody, 'tr');
            $this->addElement($tr, 'td', $examen->libelle ?? '');
            $dateEx = $examen->date_examen ? \Carbon\Carbon::parse($examen->date_examen)->format('d/m/Y') : '';
            $this->addElement($tr, 'td', $dateEx);
            $this->addElement($tr, 'td', $examen->resultats ?? '');
            $this->addElement($tr, 'td', $examen->statut ?? '');

            // Structured entry
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $organizer = $this->ce($entry, 'organizer');
            $organizer->setAttribute('classCode', 'BATTERY');
            $organizer->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($organizer, '2.16.840.1.113883.10.20.22.4.1');
            $this->addIdElement($organizer, self::OID_ROOT, 'exam-' . $examen->id);

            $orgCode = $this->ce($organizer, 'code');
            $orgCode->setAttribute('displayName', $examen->libelle ?? '');
            $orgCode->setAttribute('codeSystem', self::OID_ROOT);

            $statusCode = $this->ce($organizer, 'statusCode');
            $statusCode->setAttribute('code', $examen->statut === 'termine' ? 'completed' : 'active');

            // Résultat (texte libre → observation)
            if ($examen->resultats) {
                $comp = $this->ce($organizer, 'component');
                $obs = $this->ce($comp, 'observation');
                $obs->setAttribute('classCode', 'OBS');
                $obs->setAttribute('moodCode', 'EVN');
                $this->addTemplateId($obs, '2.16.840.1.113883.10.20.22.4.2');
                $this->addIdElement($obs, self::OID_ROOT, 'exam-res-' . $examen->id);

                $obsCode = $this->ce($obs, 'code');
                $obsCode->setAttribute('displayName', $examen->libelle ?? '');
                $obsCode->setAttribute('codeSystem', self::OID_ROOT);

                $obsStatus = $this->ce($obs, 'statusCode');
                $obsStatus->setAttribute('code', 'completed');

                if ($examen->date_examen) {
                    $et = $this->ce($obs, 'effectiveTime');
                    $et->setAttribute('value', \Carbon\Carbon::parse($examen->date_examen)->format('Ymd'));
                }

                $val = $this->ce($obs, 'value');
                $val->setAttribute('xsi:type', 'ST');
                $val->appendChild($this->dom->createTextNode($examen->resultats));
            }
        }
    }

    // ── History (Antécédents personnels) ─────────────────────────────────────

    private function addHistorySection(DOMElement $body, $antecedents): void
    {
        $section = $this->createSection($body, self::TPL_HISTORY_SECTION, self::OID_LOINC, '11348-0', 'History of Past illness Narrative', 'Antécédents Personnels');

        $text = $this->ce($section, 'text');
        $list = $this->ce($text, 'list');

        foreach ($antecedents as $ant) {
            $item = $this->ce($list, 'item');
            $label = $ant->libelle ?? '';
            if ($ant->code_cim) {
                $label .= ' [CIM-10: ' . $ant->code_cim . ']';
            }
            if ($ant->date_evenement) {
                $label .= ' — ' . \Carbon\Carbon::parse($ant->date_evenement)->format('d/m/Y');
            }
            $item->appendChild($this->dom->createTextNode($label));

            // Entry
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $obs = $this->ce($entry, 'observation');
            $obs->setAttribute('classCode', 'OBS');
            $obs->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($obs, '2.16.840.1.113883.10.20.22.4.4');
            $this->addIdElement($obs, self::OID_ROOT, 'ant-' . $ant->id);

            $obsCode = $this->ce($obs, 'code');
            $obsCode->setAttribute('code', '55607006');
            $obsCode->setAttribute('codeSystem', self::OID_SNOMED);
            $obsCode->setAttribute('displayName', 'Problem');

            $statusCode = $this->ce($obs, 'statusCode');
            $statusCode->setAttribute('code', $ant->resolution ? 'completed' : 'active');

            if ($ant->date_evenement) {
                $et = $this->ce($obs, 'effectiveTime');
                $low = $this->ce($et, 'low');
                $low->setAttribute('value', \Carbon\Carbon::parse($ant->date_evenement)->format('Ymd'));
            }

            $val = $this->ce($obs, 'value');
            $val->setAttribute('xsi:type', 'CD');
            $val->setAttribute('displayName', $ant->libelle ?? '');

            if ($ant->snomed_code) {
                $val->setAttribute('code', $ant->snomed_code);
                $val->setAttribute('codeSystem', self::OID_SNOMED);
                $val->setAttribute('codeSystemName', 'SNOMED CT');
                if ($ant->code_cim) {
                    $tr = $this->ce($val, 'translation');
                    $tr->setAttribute('code', $ant->code_cim);
                    $tr->setAttribute('codeSystem', self::OID_ICD10);
                    $tr->setAttribute('codeSystemName', 'ICD-10');
                    $tr->setAttribute('displayName', $ant->libelle ?? '');
                }
            } elseif ($ant->code_cim) {
                $val->setAttribute('code', $ant->code_cim);
                $val->setAttribute('codeSystem', self::OID_ICD10);
                $val->setAttribute('codeSystemName', 'ICD-10');
            } else {
                $val->setAttribute('codeSystem', self::OID_ROOT);
            }
        }
    }

    // ── Family History ───────────────────────────────────────────────────────

    private function addFamilyHistorySection(DOMElement $body, $antecedents): void
    {
        $section = $this->createSection($body, self::TPL_FAMILY_HISTORY_SECTION, self::OID_LOINC, '10157-6', 'History of family member diseases Narrative', 'Antécédents Familiaux');

        $text = $this->ce($section, 'text');
        $list = $this->ce($text, 'list');

        foreach ($antecedents as $ant) {
            $item = $this->ce($list, 'item');
            $label = $ant->libelle ?? '';
            if ($ant->filiation) {
                $label .= ' (' . $ant->filiation . ')';
            }
            $item->appendChild($this->dom->createTextNode($label));

            // Entry
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $organizer = $this->ce($entry, 'organizer');
            $organizer->setAttribute('classCode', 'CLUSTER');
            $organizer->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($organizer, '2.16.840.1.113883.10.20.22.4.45');
            $this->addIdElement($organizer, self::OID_ROOT, 'fhx-' . $ant->id);

            $statusCode = $this->ce($organizer, 'statusCode');
            $statusCode->setAttribute('code', 'completed');

            // Sujet (parent)
            $subject = $this->ce($organizer, 'subject');
            $relatedSubject = $this->ce($subject, 'relatedSubject');
            $relatedSubject->setAttribute('classCode', 'PRS');

            $relCode = $this->ce($relatedSubject, 'code');
            $relCode->setAttribute('codeSystem', '2.16.840.1.113883.5.111');
            $relCode->setAttribute('displayName', $ant->filiation ?? 'Membre de la famille');

            // Observation (la pathologie)
            $comp = $this->ce($organizer, 'component');
            $obs = $this->ce($comp, 'observation');
            $obs->setAttribute('classCode', 'OBS');
            $obs->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($obs, '2.16.840.1.113883.10.20.22.4.46');
            $this->addIdElement($obs, self::OID_ROOT, 'fhx-obs-' . $ant->id);

            $obsCode = $this->ce($obs, 'code');
            $obsCode->setAttribute('code', '64572001');
            $obsCode->setAttribute('codeSystem', self::OID_SNOMED);
            $obsCode->setAttribute('displayName', 'Condition');

            $obsStatus = $this->ce($obs, 'statusCode');
            $obsStatus->setAttribute('code', 'completed');

            $val = $this->ce($obs, 'value');
            $val->setAttribute('xsi:type', 'CD');
            $val->setAttribute('displayName', $ant->libelle ?? '');
            if ($ant->snomed_code) {
                $val->setAttribute('code', $ant->snomed_code);
                $val->setAttribute('codeSystem', self::OID_SNOMED);
                $val->setAttribute('codeSystemName', 'SNOMED CT');
                if ($ant->code_cim) {
                    $tr = $this->ce($val, 'translation');
                    $tr->setAttribute('code', $ant->code_cim);
                    $tr->setAttribute('codeSystem', self::OID_ICD10);
                    $tr->setAttribute('codeSystemName', 'ICD-10');
                }
            } elseif ($ant->code_cim) {
                $val->setAttribute('code', $ant->code_cim);
                $val->setAttribute('codeSystem', self::OID_ICD10);
            } else {
                $val->setAttribute('codeSystem', self::OID_ROOT);
            }
        }
    }

    // ── Encounters ───────────────────────────────────────────────────────────

    private function addEncountersSection(DOMElement $body, $consultations): void
    {
        $section = $this->createSection($body, self::TPL_ENCOUNTERS_SECTION, self::OID_LOINC, '46240-8', 'History of Hospitalizations+Outpatient visits Narrative', 'Consultations');

        $text = $this->ce($section, 'text');
        $table = $this->ce($text, 'table');
        $thead = $this->ce($table, 'thead');
        $tr = $this->ce($thead, 'tr');
        $this->addElement($tr, 'th', 'Date');
        $this->addElement($tr, 'th', 'Type');
        $this->addElement($tr, 'th', 'Motif');
        $this->addElement($tr, 'th', 'Médecin');
        $this->addElement($tr, 'th', 'Statut');

        $tbody = $this->ce($table, 'tbody');
        foreach ($consultations as $consult) {
            $tr = $this->ce($tbody, 'tr');
            $this->addElement($tr, 'td', $consult->date ? \Carbon\Carbon::parse($consult->date)->format('d/m/Y') : '');
            $this->addElement($tr, 'td', $consult->type ?? '');
            $this->addElement($tr, 'td', $consult->motif_principal ?? '');
            $medecin = $consult->user;
            $this->addElement($tr, 'td', $medecin ? ('Dr ' . ($medecin->nom ?? '') . ' ' . ($medecin->prenoms ?? '')) : '');
            $this->addElement($tr, 'td', $consult->statut ?? '');

            // Entry
            $entry = $this->ce($section, 'entry');
            $entry->setAttribute('typeCode', 'DRIV');
            $enc = $this->ce($entry, 'encounter');
            $enc->setAttribute('classCode', 'ENC');
            $enc->setAttribute('moodCode', 'EVN');
            $this->addTemplateId($enc, '2.16.840.1.113883.10.20.22.4.49');
            $this->addIdElement($enc, self::OID_ROOT, 'enc-' . $consult->id);

            $encCode = $this->ce($enc, 'code');
            if ($consult->type === 'teleconsultation') {
                $encCode->setAttribute('code', 'VR');
                $encCode->setAttribute('displayName', 'virtual');
            } else {
                $encCode->setAttribute('code', 'AMB');
                $encCode->setAttribute('displayName', 'ambulatory');
            }
            $encCode->setAttribute('codeSystem', self::OID_HL7_ACTCODE);

            if ($consult->date) {
                $et = $this->ce($enc, 'effectiveTime');
                $et->setAttribute('value', \Carbon\Carbon::parse($consult->date)->format('YmdHis'));
            }

            // Performer (médecin)
            if ($medecin) {
                $performer = $this->ce($enc, 'performer');
                $assignedEntity = $this->ce($performer, 'assignedEntity');
                $this->addIdElement($assignedEntity, self::OID_PRACTITIONERS, (string) $medecin->id);
                $person = $this->ce($assignedEntity, 'assignedPerson');
                $name = $this->ce($person, 'name');
                $this->addElement($name, 'prefix', 'Dr');
                $this->addElement($name, 'family', $medecin->nom ?? '');
                $this->addElement($name, 'given', $medecin->prenoms ?? '');
            }
        }
    }

    // ── Reason for Visit (Consultation Note) ─────────────────────────────────

    private function addReasonSection(DOMElement $body, Consultation $consultation): void
    {
        $comp = $this->ce($body, 'component');
        $section = $this->ce($comp, 'section');

        $code = $this->ce($section, 'code');
        $code->setAttribute('code', '29299-5');
        $code->setAttribute('codeSystem', self::OID_LOINC);
        $code->setAttribute('displayName', 'Reason for visit Narrative');

        $this->addElement($section, 'title', 'Motif de Consultation');

        $text = $this->ce($section, 'text');

        if ($consultation->motif_principal) {
            $para = $this->ce($text, 'paragraph');
            $bold = $this->ce($para, 'content');
            $bold->setAttribute('styleCode', 'Bold');
            $bold->appendChild($this->dom->createTextNode('Motif principal : '));
            $para->appendChild($this->dom->createTextNode($consultation->motif_principal));
        }

        if ($consultation->histoire_maladie_symptomes) {
            $para2 = $this->ce($text, 'paragraph');
            $bold2 = $this->ce($para2, 'content');
            $bold2->setAttribute('styleCode', 'Bold');
            $bold2->appendChild($this->dom->createTextNode('Histoire de la maladie : '));
            $para2->appendChild($this->dom->createTextNode($consultation->histoire_maladie_symptomes));
        }
    }

    // ── Plan of Treatment ────────────────────────────────────────────────────

    private function addPlanSection(DOMElement $body, Consultation $consultation): void
    {
        $comp = $this->ce($body, 'component');
        $section = $this->ce($comp, 'section');

        $this->addTemplateId($section, self::TPL_PLAN_SECTION);

        $code = $this->ce($section, 'code');
        $code->setAttribute('code', '18776-5');
        $code->setAttribute('codeSystem', self::OID_LOINC);
        $code->setAttribute('displayName', 'Plan of care note');

        $this->addElement($section, 'title', 'Conduite à Tenir');

        $text = $this->ce($section, 'text');
        $para = $this->ce($text, 'paragraph');
        $para->appendChild($this->dom->createTextNode($consultation->conduite_a_tenir));
    }

    // ── Assessment (Conclusion) ──────────────────────────────────────────────

    private function addAssessmentSection(DOMElement $body, Consultation $consultation): void
    {
        $comp = $this->ce($body, 'component');
        $section = $this->ce($comp, 'section');

        $code = $this->ce($section, 'code');
        $code->setAttribute('code', '51848-0');
        $code->setAttribute('codeSystem', self::OID_LOINC);
        $code->setAttribute('displayName', 'Evaluation note');

        $this->addElement($section, 'title', 'Conclusion Médicale');

        $text = $this->ce($section, 'text');
        $para = $this->ce($text, 'paragraph');
        $para->appendChild($this->dom->createTextNode($consultation->conclusion_medicale));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // XML HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Create element, append to parent.
     */
    private function ce(DOMElement $parent, string $name): DOMElement
    {
        $el = $this->dom->createElement($name);
        $parent->appendChild($el);
        return $el;
    }

    private function addElement(DOMElement $parent, string $name, ?string $text = null, array $attrs = []): DOMElement
    {
        $el = $this->dom->createElement($name);
        if ($text !== null) {
            $el->appendChild($this->dom->createTextNode($text));
        }
        foreach ($attrs as $k => $v) {
            $el->setAttribute($k, $v);
        }
        $parent->appendChild($el);
        return $el;
    }

    private function addTemplateId(DOMElement $parent, string $root, ?string $extension = null): void
    {
        $el = $this->dom->createElement('templateId');
        $el->setAttribute('root', $root);
        if ($extension) {
            $el->setAttribute('extension', $extension);
        }
        $parent->appendChild($el);
    }

    private function addId(DOMElement $parent, string $root, string $extension): void
    {
        $el = $this->dom->createElement('id');
        $el->setAttribute('root', $root);
        $el->setAttribute('extension', $extension);
        $parent->appendChild($el);
    }

    private function addIdElement(DOMElement $parent, string $root, string $extension): void
    {
        $this->addId($parent, $root, $extension);
    }

    private function addCode(DOMElement $parent, string $codeSystem, string $code, string $displayName, string $codeSystemName): void
    {
        $el = $this->dom->createElement('code');
        $el->setAttribute('code', $code);
        $el->setAttribute('codeSystem', $codeSystem);
        $el->setAttribute('codeSystemName', $codeSystemName);
        $el->setAttribute('displayName', $displayName);
        $parent->appendChild($el);
    }

    private function addEffectiveTime(DOMElement $parent, $dateTime): void
    {
        $el = $this->dom->createElement('effectiveTime');
        $el->setAttribute('value', \Carbon\Carbon::parse($dateTime)->format('YmdHis'));
        $parent->appendChild($el);
    }

    private function addConfidentialityCode(DOMElement $parent, string $level): void
    {
        $el = $this->dom->createElement('confidentialityCode');
        $el->setAttribute('code', $level);
        $el->setAttribute('codeSystem', self::OID_HL7_CONF);
        $displayMap = ['N' => 'Normal', 'R' => 'Restricted', 'V' => 'Very Restricted'];
        $el->setAttribute('displayName', $displayMap[$level] ?? 'Normal');
        $parent->appendChild($el);
    }

    private function meta($model): array
    {
        return ['lastUpdated' => $model->updated_at?->toIso8601String()];
    }

    /**
     * Crée une section CDA avec templateId, code et title.
     */
    private function createSection(DOMElement $body, string $templateId, string $codeSystem, string $code, string $displayName, string $title): DOMElement
    {
        $comp = $this->ce($body, 'component');
        $section = $this->ce($comp, 'section');
        $this->addTemplateId($section, $templateId);

        $codeEl = $this->ce($section, 'code');
        $codeEl->setAttribute('code', $code);
        $codeEl->setAttribute('codeSystem', $codeSystem);
        $codeEl->setAttribute('displayName', $displayName);

        $this->addElement($section, 'title', $title);

        return $section;
    }
}
