<?php

namespace App\Services\Fhir;

use App\Models\Allergie;
use App\Models\Antecedent;
use App\Models\Constante;
use App\Models\Consultation;
use App\Models\Diagnostic;
use App\Models\DicomStudy;
use App\Models\Examen;
use App\Models\Patient;
use App\Models\PatientConsent;
use App\Models\Prescription;
use App\Models\RendezVous;
use App\Models\Structure;
use App\Models\User;

/**
 * Transforme les modèles Eloquent TLM-BFA en ressources HL7 FHIR R4.
 *
 * @see https://www.hl7.org/fhir/R4/
 */
class FhirTransformer
{
    private const SYSTEM_BASE = 'https://tlm-bfa.bf/fhir';

    // ── Patient ──────────────────────────────────────────────────────────────

    public function toPatient(Patient $patient): array
    {
        $resource = [
            'resourceType' => 'Patient',
            'id' => (string) $patient->id,
            'meta' => $this->meta($patient),
            'identifier' => [],
            'active' => is_null($patient->deleted_at),
            'name' => [
                [
                    'use' => 'official',
                    'family' => $patient->nom,
                    'given' => [$patient->prenoms],
                ],
            ],
            'gender' => $this->mapGender($patient->sexe),
            'birthDate' => $patient->date_naissance?->toDateString(),
        ];

        // MRN du dossier
        if ($patient->dossier) {
            $resource['identifier'][] = [
                'use' => 'official',
                'type' => [
                    'coding' => [[
                        'system' => 'http://terminology.hl7.org/CodeSystem/v2-0203',
                        'code' => 'MR',
                        'display' => 'Medical record number',
                    ]],
                ],
                'system' => self::SYSTEM_BASE . '/patient-id',
                'value' => $patient->dossier->identifiant,
            ];
        }

        // Telecom
        $telecoms = [];
        if ($patient->telephone_1) {
            $telecoms[] = ['system' => 'phone', 'value' => $patient->telephone_1, 'use' => 'mobile'];
        }
        if ($patient->telephone_2) {
            $telecoms[] = ['system' => 'phone', 'value' => $patient->telephone_2, 'use' => 'home'];
        }
        if ($patient->email) {
            $telecoms[] = ['system' => 'email', 'value' => $patient->email, 'use' => 'home'];
        }
        if ($telecoms) {
            $resource['telecom'] = $telecoms;
        }

        return $resource;
    }

    // ── Practitioner ─────────────────────────────────────────────────────────

    public function toPractitioner(User $user): array
    {
        $resource = [
            'resourceType' => 'Practitioner',
            'id' => (string) $user->id,
            'meta' => $this->meta($user),
            'identifier' => [],
            'active' => $user->status === 'actif',
            'name' => [
                [
                    'use' => 'official',
                    'family' => $user->nom,
                    'given' => [$user->prenoms],
                    'prefix' => $user->specialite ? ['Dr.'] : [],
                ],
            ],
            'gender' => $this->mapGender($user->sexe),
            'birthDate' => $user->date_naissance?->toDateString(),
        ];

        if ($user->matricule) {
            $resource['identifier'][] = [
                'use' => 'official',
                'system' => self::SYSTEM_BASE . '/matricule',
                'value' => $user->matricule,
            ];
        }
        if ($user->numero_ordre) {
            $resource['identifier'][] = [
                'use' => 'official',
                'system' => self::SYSTEM_BASE . '/ordre-professionnel',
                'value' => $user->numero_ordre,
            ];
        }

        $telecoms = [];
        if ($user->telephone_1) {
            $telecoms[] = ['system' => 'phone', 'value' => $user->telephone_1, 'use' => 'work'];
        }
        if ($user->email) {
            $telecoms[] = ['system' => 'email', 'value' => $user->email, 'use' => 'work'];
        }
        if ($telecoms) {
            $resource['telecom'] = $telecoms;
        }

        if ($user->specialite) {
            $resource['qualification'] = [
                [
                    'code' => [
                        'coding' => [[
                            'system' => self::SYSTEM_BASE . '/specialite',
                            'code' => $user->specialite,
                            'display' => $user->specialite,
                        ]],
                    ],
                ],
            ];
        }

        return $resource;
    }

    // ── Organization ─────────────────────────────────────────────────────────

    public function toOrganization(Structure $structure): array
    {
        $resource = [
            'resourceType' => 'Organization',
            'id' => (string) $structure->id,
            'meta' => $this->meta($structure),
            'active' => (bool) $structure->actif,
            'name' => $structure->libelle,
        ];

        if ($structure->typeStructure) {
            $resource['type'] = [
                [
                    'coding' => [[
                        'system' => self::SYSTEM_BASE . '/type-structure',
                        'code' => (string) $structure->type_structure_id,
                        'display' => $structure->typeStructure->libelle ?? '',
                    ]],
                ],
            ];
        }

        $telecoms = [];
        if ($structure->telephone) {
            $telecoms[] = ['system' => 'phone', 'value' => $structure->telephone, 'use' => 'work'];
        }
        if ($structure->email) {
            $telecoms[] = ['system' => 'email', 'value' => $structure->email, 'use' => 'work'];
        }
        if ($telecoms) {
            $resource['telecom'] = $telecoms;
        }

        if ($structure->parent_id) {
            $resource['partOf'] = [
                'reference' => 'Organization/' . $structure->parent_id,
            ];
        }

        return $resource;
    }

    // ── Encounter (Consultation) ─────────────────────────────────────────────

    public function toEncounter(Consultation $consultation): array
    {
        $resource = [
            'resourceType' => 'Encounter',
            'id' => (string) $consultation->id,
            'meta' => $this->meta($consultation),
            'status' => $this->mapEncounterStatus($consultation->statut),
            'class' => $this->mapEncounterClass($consultation->type),
            'type' => [
                [
                    'coding' => [[
                        'system' => self::SYSTEM_BASE . '/type-consultation',
                        'code' => $consultation->type ?? 'presentiel',
                        'display' => $consultation->type === 'teleconsultation' ? 'Téléconsultation' : 'Consultation présentielle',
                    ]],
                ],
            ],
            'subject' => $this->patientRef($consultation->dossierPatient),
            'period' => [
                'start' => $consultation->date?->toIso8601String(),
            ],
        ];

        if ($consultation->user_id) {
            $resource['participant'] = [
                [
                    'type' => [[
                        'coding' => [[
                            'system' => 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                            'code' => 'ATND',
                            'display' => 'attender',
                        ]],
                    ]],
                    'individual' => ['reference' => 'Practitioner/' . $consultation->user_id],
                ],
            ];
        }

        if ($consultation->motif_principal) {
            $resource['reasonCode'] = [
                ['text' => $consultation->motif_principal],
            ];
        }

        if ($consultation->rendez_vous_id) {
            $resource['appointment'] = [
                ['reference' => 'Appointment/' . $consultation->rendez_vous_id],
            ];
        }

        return $resource;
    }

    // ── Observation (Constante / Vital Signs) ────────────────────────────────

    public function toObservationBundle(Constante $constante): array
    {
        $observations = [];
        $vitalSigns = [
            'poids' => ['29463-7', 'kg', 'Body weight'],
            'taille' => ['8302-2', 'cm', 'Body height'],
            'imc' => ['39156-5', 'kg/m2', 'Body mass index'],
            'temperature' => ['8310-5', 'Cel', 'Body temperature'],
            'tension_systolique' => ['8480-6', 'mmHg', 'Systolic blood pressure'],
            'tension_diastolique' => ['8462-4', 'mmHg', 'Diastolic blood pressure'],
            'frequence_cardiaque' => ['8867-4', '/min', 'Heart rate'],
            'frequence_respiratoire' => ['9279-1', '/min', 'Respiratory rate'],
            'saturation_o2' => ['2708-6', '%', 'Oxygen saturation'],
            'glycemie' => ['2339-0', 'g/L', 'Glucose'],
        ];

        foreach ($vitalSigns as $field => [$loincCode, $unit, $display]) {
            $value = $constante->$field;
            if (is_null($value)) {
                continue;
            }

            $observations[] = [
                'resourceType' => 'Observation',
                'id' => $constante->id . '-' . $field,
                'meta' => $this->meta($constante),
                'status' => 'final',
                'category' => [
                    [
                        'coding' => [[
                            'system' => 'http://terminology.hl7.org/CodeSystem/observation-category',
                            'code' => 'vital-signs',
                            'display' => 'Vital Signs',
                        ]],
                    ],
                ],
                'code' => [
                    'coding' => [[
                        'system' => 'http://loinc.org',
                        'code' => $loincCode,
                        'display' => $display,
                    ]],
                    'text' => $display,
                ],
                'subject' => $this->patientRefFromDossierId($constante->dossier_patient_id),
                'effectiveDateTime' => $constante->created_at?->toIso8601String(),
                'valueQuantity' => [
                    'value' => (float) $value,
                    'unit' => $unit,
                    'system' => 'http://unitsofmeasure.org',
                    'code' => $unit,
                ],
            ];

            if ($constante->user_id) {
                $observations[array_key_last($observations)]['performer'] = [
                    ['reference' => 'Practitioner/' . $constante->user_id],
                ];
            }

            if ($constante->consultation_id) {
                $observations[array_key_last($observations)]['encounter'] = [
                    'reference' => 'Encounter/' . $constante->consultation_id,
                ];
            }
        }

        return $observations;
    }

    // ── Condition (Diagnostic) ───────────────────────────────────────────────

    public function toCondition(Diagnostic $diagnostic): array
    {
        $resource = [
            'resourceType' => 'Condition',
            'id' => 'diag-' . $diagnostic->id,
            'meta' => $this->meta($diagnostic),
            'clinicalStatus' => [
                'coding' => [[
                    'system' => 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                    'code' => $this->mapConditionClinicalStatus($diagnostic->statut),
                ]],
            ],
            'category' => [
                [
                    'coding' => [[
                        'system' => 'http://terminology.hl7.org/CodeSystem/condition-category',
                        'code' => 'encounter-diagnosis',
                        'display' => 'Encounter Diagnosis',
                    ]],
                ],
            ],
            'subject' => $this->patientRefFromDossierId($diagnostic->dossier_patient_id),
        ];

        // Code CIM-10 + ICD-11 + SNOMED CT
        $coding = [];
        if ($diagnostic->code_cim) {
            $coding[] = [
                'system' => 'http://hl7.org/fhir/sid/icd-10',
                'code' => $diagnostic->code_cim,
                'display' => $diagnostic->libelle,
            ];
        }
        if ($diagnostic->code_icd11) {
            $coding[] = [
                'system' => 'http://id.who.int/icd/release/11/mms',
                'code' => $diagnostic->code_icd11,
                'display' => $diagnostic->titre_icd11 ?? $diagnostic->libelle,
            ];
        }
        if ($diagnostic->snomed_code) {
            $coding[] = [
                'system' => 'http://snomed.info/sct',
                'code' => $diagnostic->snomed_code,
                'display' => $diagnostic->snomed_display ?? $diagnostic->libelle,
            ];
        }
        $resource['code'] = [
            'coding' => $coding ?: [[
                'system' => self::SYSTEM_BASE . '/diagnostic',
                'code' => (string) $diagnostic->id,
                'display' => $diagnostic->libelle,
            ]],
            'text' => $diagnostic->libelle,
        ];

        if ($diagnostic->gravite) {
            $resource['severity'] = [
                'coding' => [[
                    'system' => self::SYSTEM_BASE . '/gravite',
                    'code' => $diagnostic->gravite,
                    'display' => $diagnostic->gravite,
                ]],
            ];
        }

        if ($diagnostic->consultation_id) {
            $resource['encounter'] = ['reference' => 'Encounter/' . $diagnostic->consultation_id];
        }

        if ($diagnostic->description) {
            $resource['note'] = [['text' => $diagnostic->description]];
        }

        return $resource;
    }

    // ── Condition (Antécédent — historique) ───────────────────────────────────

    public function toConditionFromAntecedent(Antecedent $antecedent): array
    {
        $isFamily = str_contains($antecedent->type ?? '', 'famil');

        $resource = [
            'resourceType' => 'Condition',
            'id' => 'ant-' . $antecedent->id,
            'meta' => $this->meta($antecedent),
            'clinicalStatus' => [
                'coding' => [[
                    'system' => 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                    'code' => $antecedent->resolution ? 'resolved' : 'active',
                ]],
            ],
            'category' => [
                [
                    'coding' => [[
                        'system' => 'http://terminology.hl7.org/CodeSystem/condition-category',
                        'code' => $isFamily ? 'problem-list-item' : 'problem-list-item',
                        'display' => $isFamily ? 'Antécédent familial' : 'Antécédent personnel',
                    ]],
                ],
            ],
            'subject' => $this->patientRefFromDossierId($antecedent->dossier_patient_id),
        ];

        $coding = [];
        if ($antecedent->code_cim) {
            $coding[] = [
                'system' => 'http://hl7.org/fhir/sid/icd-10',
                'code' => $antecedent->code_cim,
                'display' => $antecedent->libelle,
            ];
        }
        if ($antecedent->code_icd11) {
            $coding[] = [
                'system' => 'http://id.who.int/icd/release/11/mms',
                'code' => $antecedent->code_icd11,
                'display' => $antecedent->titre_icd11 ?? $antecedent->libelle,
            ];
        }
        if ($antecedent->snomed_code) {
            $coding[] = [
                'system' => 'http://snomed.info/sct',
                'code' => $antecedent->snomed_code,
                'display' => $antecedent->snomed_display ?? $antecedent->libelle,
            ];
        }
        $resource['code'] = [
            'coding' => $coding ?: [[
                'system' => self::SYSTEM_BASE . '/antecedent',
                'code' => (string) $antecedent->id,
                'display' => $antecedent->libelle,
            ]],
            'text' => $antecedent->libelle,
        ];

        if ($antecedent->date_evenement) {
            $resource['onsetDateTime'] = $antecedent->date_evenement->toDateString();
        }

        if ($antecedent->description) {
            $resource['note'] = [['text' => $antecedent->description]];
        }

        return $resource;
    }

    // ── AllergyIntolerance ───────────────────────────────────────────────────

    public function toAllergyIntolerance(Allergie $allergie): array
    {
        $resource = [
            'resourceType' => 'AllergyIntolerance',
            'id' => (string) $allergie->id,
            'meta' => $this->meta($allergie),
            'clinicalStatus' => [
                'coding' => [[
                    'system' => 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
                    'code' => 'active',
                ]],
            ],
            'code' => [
                'text' => $allergie->allergenes,
            ],
            'patient' => $this->patientRefFromDossierId($allergie->dossier_patient_id),
        ];

        if ($allergie->severite) {
            $severityMap = [
                'legere' => 'low', 'légère' => 'low',
                'moderee' => 'moderate', 'modérée' => 'moderate',
                'severe' => 'high', 'sévère' => 'high',
            ];
            $resource['criticality'] = $severityMap[strtolower($allergie->severite)] ?? 'unable-to-assess';
        }

        if ($allergie->manifestations) {
            $resource['reaction'] = [
                [
                    'manifestation' => [
                        ['text' => $allergie->manifestations],
                    ],
                ],
            ];
        }

        if ($allergie->consultation_id) {
            $resource['encounter'] = ['reference' => 'Encounter/' . $allergie->consultation_id];
        }

        return $resource;
    }

    // ── MedicationRequest (Prescription) ─────────────────────────────────────

    public function toMedicationRequest(Prescription $prescription): array
    {
        $resource = [
            'resourceType' => 'MedicationRequest',
            'id' => (string) $prescription->id,
            'meta' => $this->meta($prescription),
            'status' => $this->mapMedicationRequestStatus($prescription->statut),
            'intent' => 'order',
            'priority' => $prescription->urgent ? 'urgent' : 'routine',
            'medicationCodeableConcept' => [
                'coding' => array_values(array_filter([
                    $prescription->atc_code ? [
                        'system' => 'http://www.whocc.no/atc',
                        'code' => $prescription->atc_code,
                        'display' => $prescription->atc_display ?? $prescription->denomination,
                    ] : null,
                    $prescription->snomed_code ? [
                        'system' => 'http://snomed.info/sct',
                        'code' => $prescription->snomed_code,
                        'display' => $prescription->snomed_display ?? $prescription->denomination,
                    ] : null,
                ])) ?: [],
                'text' => $prescription->denomination,
            ],
            'subject' => $this->patientRefFromDossierId($prescription->dossier_patient_id),
            'authoredOn' => $prescription->created_at?->toIso8601String(),
        ];

        if ($prescription->consultation_id) {
            $resource['encounter'] = ['reference' => 'Encounter/' . $prescription->consultation_id];
        }

        // Dosage
        $dosage = ['text' => $prescription->posologie ?? ''];
        if ($prescription->duree_jours) {
            $dosage['timing'] = [
                'repeat' => [
                    'boundsDuration' => [
                        'value' => $prescription->duree_jours,
                        'unit' => 'jours',
                        'system' => 'http://unitsofmeasure.org',
                        'code' => 'd',
                    ],
                ],
            ];
        }
        $resource['dosageInstruction'] = [$dosage];

        if ($prescription->date_debut || $prescription->date_fin) {
            $resource['dispenseRequest'] = [
                'validityPeriod' => [
                    'start' => $prescription->date_debut?->toDateString(),
                    'end' => $prescription->date_fin?->toDateString(),
                ],
            ];
        }

        if ($prescription->instructions) {
            $resource['note'] = [['text' => $prescription->instructions]];
        }

        return $resource;
    }

    // ── DiagnosticReport (Examen) ────────────────────────────────────────────

    public function toDiagnosticReport(Examen $examen): array
    {
        $resource = [
            'resourceType' => 'DiagnosticReport',
            'id' => (string) $examen->id,
            'meta' => $this->meta($examen),
            'status' => $this->mapDiagnosticReportStatus($examen->statut),
            'code' => [
                'coding' => array_values(array_filter([
                    $examen->loinc_code ? [
                        'system' => 'http://loinc.org',
                        'code' => $examen->loinc_code,
                        'display' => $examen->loinc_display ?? $examen->libelle,
                    ] : null,
                    $examen->snomed_code ? [
                        'system' => 'http://snomed.info/sct',
                        'code' => $examen->snomed_code,
                        'display' => $examen->snomed_display ?? $examen->libelle,
                    ] : null,
                    [
                        'system' => self::SYSTEM_BASE . '/type-examen',
                        'code' => $examen->type ?? (string) ($examen->type_examen_id ?? 'unknown'),
                        'display' => $examen->libelle,
                    ],
                ])),
                'text' => $examen->libelle,
            ],
            'subject' => $this->patientRefFromDossierId($examen->dossier_patient_id),
        ];

        if ($examen->date_demande) {
            $resource['effectiveDateTime'] = $examen->date_examen?->toDateString()
                ?? $examen->date_demande->toDateString();
        }

        if ($examen->date_reception_resultat) {
            $resource['issued'] = $examen->date_reception_resultat->toIso8601String();
        }

        if ($examen->consultation_id) {
            $resource['encounter'] = ['reference' => 'Encounter/' . $examen->consultation_id];
        }

        if ($examen->resultats) {
            $resource['conclusion'] = $examen->resultats;
        }

        if ($examen->commentaire) {
            $resource['conclusionCode'] = [['text' => $examen->commentaire]];
        }

        return $resource;
    }

    // ── Appointment (RendezVous) ─────────────────────────────────────────────

    public function toAppointment(RendezVous $rdv): array
    {
        $resource = [
            'resourceType' => 'Appointment',
            'id' => (string) $rdv->id,
            'meta' => $this->meta($rdv),
            'status' => $this->mapAppointmentStatus($rdv->statut),
            'serviceType' => [
                [
                    'coding' => [[
                        'system' => self::SYSTEM_BASE . '/type-rdv',
                        'code' => $rdv->type ?? 'presentiel',
                        'display' => $rdv->type === 'teleconsultation' ? 'Téléconsultation' : 'Consultation présentielle',
                    ]],
                ],
            ],
            'priority' => $this->mapPriority($rdv->priorite),
            'description' => $rdv->motif,
            'start' => $this->combineDateHeure($rdv),
            'participant' => [],
        ];

        // Participant Patient
        if ($rdv->patient_id) {
            $resource['participant'][] = [
                'actor' => ['reference' => 'Patient/' . $rdv->patient_id],
                'status' => 'accepted',
            ];
        }

        // Participant Practitioner
        if ($rdv->user_id) {
            $resource['participant'][] = [
                'actor' => ['reference' => 'Practitioner/' . $rdv->user_id],
                'status' => 'accepted',
            ];
        }

        if ($rdv->motif_annulation) {
            $resource['cancelationReason'] = ['text' => $rdv->motif_annulation];
        }

        return $resource;
    }

    // ── Consent (PatientConsent) ─────────────────────────────────────────────

    public function toConsent(PatientConsent $consent): array
    {
        $resource = [
            'resourceType' => 'Consent',
            'id' => (string) $consent->id,
            'meta' => $this->meta($consent),
            'status' => $consent->is_active ? 'active' : ($consent->revoked_at ? 'rejected' : 'inactive'),
            'scope' => [
                'coding' => [[
                    'system' => 'http://terminology.hl7.org/CodeSystem/consentscope',
                    'code' => 'patient-privacy',
                    'display' => 'Privacy Consent',
                ]],
            ],
            'category' => [
                [
                    'coding' => [[
                        'system' => self::SYSTEM_BASE . '/consent-type',
                        'code' => $consent->type,
                        'display' => $consent->type,
                    ]],
                ],
            ],
            'patient' => ['reference' => 'Patient/' . $consent->patient_id],
            'dateTime' => $consent->accepted_at?->toIso8601String() ?? $consent->created_at?->toIso8601String(),
        ];

        // Texte du consentement
        $resource['policyRule'] = [
            'text' => $consent->texte_consentement,
        ];

        // Versioning
        $resource['extension'] = [
            [
                'url' => self::SYSTEM_BASE . '/consent-version',
                'valueInteger' => $consent->version,
            ],
        ];

        // Proxy / tuteur
        if ($consent->is_proxy) {
            $resource['performer'] = [
                [
                    'display' => $consent->proxy_nom . ' (' . $consent->proxy_lien . ')',
                    'extension' => [
                        [
                            'url' => self::SYSTEM_BASE . '/proxy-relationship',
                            'valueString' => $consent->proxy_lien,
                        ],
                    ],
                ],
            ];
        }

        return $resource;
    }

    // ── Bundle helper ────────────────────────────────────────────────────────
    // ── ImagingStudy (DicomStudy) ────────────────────────────────────────────

    public function toImagingStudy(DicomStudy $study): array
    {
        $resource = [
            'resourceType' => 'ImagingStudy',
            'id' => (string) $study->id,
            'meta' => $this->meta($study),
            'identifier' => [
                [
                    'use' => 'official',
                    'system' => 'urn:dicom:uid',
                    'value' => 'urn:oid:' . $study->study_instance_uid,
                ],
            ],
            'status' => $this->mapImagingStudyStatus($study->statut),
            'modality' => [
                [
                    'system' => 'http://dicom.nema.org/resources/ontology/DCM',
                    'code' => $study->modality ?? 'OT',
                ],
            ],
            'subject' => $study->patient_id
                ? ['reference' => 'Patient/' . $study->patient_id]
                : ['display' => $study->patient_dicom_name ?? 'Unknown'],
            'started' => $study->study_date?->toIso8601String(),
            'numberOfSeries' => $study->number_of_series,
            'numberOfInstances' => $study->number_of_instances,
            'description' => $study->study_description,
        ];

        if ($study->accession_number) {
            $resource['identifier'][] = [
                'use' => 'usual',
                'type' => [
                    'coding' => [[
                        'system' => 'http://terminology.hl7.org/CodeSystem/v2-0203',
                        'code' => 'ACSN',
                        'display' => 'Accession ID',
                    ]],
                ],
                'value' => $study->accession_number,
            ];
        }

        if ($study->consultation_id) {
            $resource['encounter'] = ['reference' => 'Encounter/' . $study->consultation_id];
        }

        if ($study->examen_id) {
            $resource['basedOn'] = [
                ['reference' => 'DiagnosticReport/' . $study->examen_id],
            ];
        }

        if ($study->referring_physician) {
            $resource['referrer'] = ['display' => $study->referring_physician];
        }

        if ($study->body_part_examined) {
            $resource['extension'] = [
                [
                    'url' => self::SYSTEM_BASE . '/body-part-examined',
                    'valueString' => $study->body_part_examined,
                ],
            ];
        }

        if ($study->interpretation) {
            $resource['note'] = [['text' => $study->interpretation]];
        }

        // Endpoint WADO-RS
        $resource['endpoint'] = [
            [
                'reference' => '#wado-rs',
                'display' => 'WADO-RS endpoint',
            ],
        ];
        $resource['contained'] = [
            [
                'resourceType' => 'Endpoint',
                'id' => 'wado-rs',
                'status' => 'active',
                'connectionType' => [
                    'system' => 'http://terminology.hl7.org/CodeSystem/endpoint-connection-type',
                    'code' => 'dicom-wado-rs',
                ],
                'payloadType' => [
                    ['text' => 'DICOM WADO-RS'],
                ],
                'address' => $study->wado_rs_url,
            ],
        ];

        return $resource;
    }
    public function toBundle(array $resources, string $type = 'searchset', int $total = 0): array
    {
        return [
            'resourceType' => 'Bundle',
            'type' => $type,
            'total' => $total ?: count($resources),
            'timestamp' => now()->toIso8601String(),
            'entry' => array_map(fn (array $resource) => [
                'fullUrl' => self::SYSTEM_BASE . '/' . $resource['resourceType'] . '/' . $resource['id'],
                'resource' => $resource,
            ], $resources),
        ];
    }

    // ── Helpers privés ───────────────────────────────────────────────────────

    private function meta($model): array
    {
        return [
            'versionId' => '1',
            'lastUpdated' => $model->updated_at?->toIso8601String() ?? $model->created_at?->toIso8601String(),
            'source' => self::SYSTEM_BASE,
        ];
    }

    private function mapImagingStudyStatus(?string $statut): string
    {
        return match ($statut) {
            'recu' => 'available',
            'en_lecture' => 'available',
            'lu' => 'available',
            'valide' => 'available',
            default => 'available',
        };
    }

    private function mapGender(?string $sexe): ?string
    {
        return match ($sexe) {
            'M' => 'male',
            'F' => 'female',
            default => 'unknown',
        };
    }

    private function mapEncounterStatus(?string $statut): string
    {
        return match ($statut) {
            'en_cours' => 'in-progress',
            'terminee' => 'finished',
            'annulee' => 'cancelled',
            default => 'planned',
        };
    }

    private function mapEncounterClass(?string $type): array
    {
        $code = $type === 'teleconsultation' ? 'VR' : 'AMB';
        $display = $type === 'teleconsultation' ? 'virtual' : 'ambulatory';

        return [
            'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            'code' => $code,
            'display' => $display,
        ];
    }

    private function mapConditionClinicalStatus(?string $statut): string
    {
        return match ($statut) {
            'resolu', 'résolu', 'resolved' => 'resolved',
            'inactif', 'inactive' => 'inactive',
            default => 'active',
        };
    }

    private function mapMedicationRequestStatus(?string $statut): string
    {
        return match ($statut) {
            'active', 'en_cours' => 'active',
            'terminee', 'completed' => 'completed',
            'annulee', 'cancelled' => 'cancelled',
            default => 'active',
        };
    }

    private function mapDiagnosticReportStatus(?string $statut): string
    {
        return match ($statut) {
            'termine', 'terminé', 'completed' => 'final',
            'en_cours', 'in_progress' => 'preliminary',
            'annule', 'annulé', 'cancelled' => 'cancelled',
            default => 'registered',
        };
    }

    private function mapAppointmentStatus(?string $statut): string
    {
        return match ($statut) {
            'confirme', 'confirmé' => 'booked',
            'en_cours' => 'arrived',
            'termine', 'terminé' => 'fulfilled',
            'annule', 'annulé' => 'cancelled',
            default => 'pending',
        };
    }

    private function mapPriority(?string $priorite): int
    {
        return match ($priorite) {
            'urgente' => 1,
            'haute' => 3,
            default => 5,
        };
    }

    private function patientRef($dossierPatient): array
    {
        return [
            'reference' => 'Patient/' . ($dossierPatient?->patient_id ?? 'unknown'),
        ];
    }

    private function patientRefFromDossierId(?int $dossierId): array
    {
        if (!$dossierId) {
            return ['reference' => 'Patient/unknown'];
        }

        static $cache = [];
        if (!isset($cache[$dossierId])) {
            $dossier = \App\Models\DossierPatient::find($dossierId);
            $cache[$dossierId] = $dossier?->patient_id ?? 'unknown';
        }

        return ['reference' => 'Patient/' . $cache[$dossierId]];
    }

    private function combineDateHeure(RendezVous $rdv): ?string
    {
        if (!$rdv->date) {
            return null;
        }

        $date = $rdv->date->toDateString();
        $heure = $rdv->heure ?? '00:00';

        return $date . 'T' . $heure . ':00+00:00';
    }
}
