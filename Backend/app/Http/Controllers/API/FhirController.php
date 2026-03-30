<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Allergie;
use App\Models\Antecedent;
use App\Models\Constante;
use App\Models\Consultation;
use App\Models\Diagnostic;
use App\Models\DossierPatient;
use App\Models\Examen;
use App\Models\Patient;
use App\Models\DicomStudy;
use App\Models\PatientConsent;
use App\Models\Prescription;
use App\Models\RendezVous;
use App\Models\Structure;
use App\Models\User;
use App\Services\Fhir\FhirTransformer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FhirController extends Controller
{
    public function __construct(private FhirTransformer $transformer)
    {
    }

    // ── CapabilityStatement (metadata) ───────────────────────────────────────

    public function metadata(): JsonResponse
    {
        return $this->fhirResponse([
            'resourceType' => 'CapabilityStatement',
            'id' => 'tlm-bfa-fhir-server',
            'name' => 'TLM-BFA FHIR Server',
            'title' => 'Plateforme de Télémédecine du Burkina Faso — FHIR R4',
            'status' => 'active',
            'experimental' => false,
            'date' => '2026-03-25',
            'publisher' => 'TLM-BFA',
            'description' => 'Serveur FHIR R4 exposant les données cliniques de la plateforme TLM-BFA pour l\'interopérabilité avec les systèmes de santé nationaux et internationaux.',
            'kind' => 'instance',
            'fhirVersion' => '4.0.1',
            'format' => ['json'],
            'rest' => [
                [
                    'mode' => 'server',
                    'resource' => [
                        $this->resourceCapability('Patient', ['read', 'search-type'], [
                            ['name' => '_id', 'type' => 'token'],
                            ['name' => 'name', 'type' => 'string'],
                            ['name' => 'gender', 'type' => 'token'],
                        ]),
                        $this->resourceCapability('Practitioner', ['read', 'search-type'], [
                            ['name' => '_id', 'type' => 'token'],
                            ['name' => 'name', 'type' => 'string'],
                        ]),
                        $this->resourceCapability('Organization', ['read', 'search-type'], [
                            ['name' => '_id', 'type' => 'token'],
                        ]),
                        $this->resourceCapability('Encounter', ['read', 'search-type'], [
                            ['name' => '_id', 'type' => 'token'],
                            ['name' => 'patient', 'type' => 'reference'],
                            ['name' => 'status', 'type' => 'token'],
                        ]),
                        $this->resourceCapability('Observation', ['search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                        ]),
                        $this->resourceCapability('Condition', ['read', 'search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                            ['name' => 'category', 'type' => 'token'],
                        ]),
                        $this->resourceCapability('AllergyIntolerance', ['read', 'search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                        ]),
                        $this->resourceCapability('MedicationRequest', ['read', 'search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                            ['name' => 'status', 'type' => 'token'],
                        ]),
                        $this->resourceCapability('DiagnosticReport', ['read', 'search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                        ]),
                        $this->resourceCapability('Appointment', ['read', 'search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                            ['name' => 'status', 'type' => 'token'],
                        ]),
                        $this->resourceCapability('Consent', ['read', 'search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                        ]),
                        $this->resourceCapability('ImagingStudy', ['read', 'search-type'], [
                            ['name' => 'patient', 'type' => 'reference'],
                            ['name' => 'modality', 'type' => 'token'],
                            ['name' => 'status', 'type' => 'token'],
                        ]),
                    ],
                ],
            ],
        ]);
    }

    // ── Patient ──────────────────────────────────────────────────────────────

    public function patientRead(int $id): JsonResponse
    {
        $patient = Patient::with('dossier')->findOrFail($id);
        return $this->fhirResponse($this->transformer->toPatient($patient));
    }

    public function patientSearch(Request $request): JsonResponse
    {
        $query = Patient::with('dossier');

        if ($request->filled('name')) {
            $name = $request->input('name');
            $query->where(function ($q) use ($name) {
                $q->where('nom', 'like', "%{$name}%")
                  ->orWhere('prenoms', 'like', "%{$name}%");
            });
        }
        if ($request->filled('gender')) {
            $genderMap = ['male' => 'M', 'female' => 'F'];
            $query->where('sexe', $genderMap[$request->input('gender')] ?? $request->input('gender'));
        }

        $patients = $query->limit(50)->get();
        $resources = $patients->map(fn ($p) => $this->transformer->toPatient($p))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $patients->count()));
    }

    // ── Practitioner ─────────────────────────────────────────────────────────

    public function practitionerRead(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        return $this->fhirResponse($this->transformer->toPractitioner($user));
    }

    public function practitionerSearch(Request $request): JsonResponse
    {
        $query = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['doctor', 'specialist', 'health_professional']));

        if ($request->filled('name')) {
            $name = $request->input('name');
            $query->where(function ($q) use ($name) {
                $q->where('nom', 'like', "%{$name}%")
                  ->orWhere('prenoms', 'like', "%{$name}%");
            });
        }

        $practitioners = $query->limit(50)->get();
        $resources = $practitioners->map(fn ($u) => $this->transformer->toPractitioner($u))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $practitioners->count()));
    }

    // ── Organization ─────────────────────────────────────────────────────────

    public function organizationRead(int $id): JsonResponse
    {
        $structure = Structure::with('typeStructure')->findOrFail($id);
        return $this->fhirResponse($this->transformer->toOrganization($structure));
    }

    public function organizationSearch(Request $request): JsonResponse
    {
        $query = Structure::with('typeStructure');
        if ($request->filled('name')) {
            $query->where('libelle', 'like', '%' . $request->input('name') . '%');
        }

        $structures = $query->limit(50)->get();
        $resources = $structures->map(fn ($s) => $this->transformer->toOrganization($s))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $structures->count()));
    }

    // ── Encounter ────────────────────────────────────────────────────────────

    public function encounterRead(int $id): JsonResponse
    {
        $consultation = Consultation::with(['dossierPatient', 'user'])->findOrFail($id);
        return $this->fhirResponse($this->transformer->toEncounter($consultation));
    }

    public function encounterSearch(Request $request): JsonResponse
    {
        $query = Consultation::with(['dossierPatient', 'user']);

        if ($request->filled('patient')) {
            $patientId = $this->extractId($request->input('patient'));
            $dossierIds = DossierPatient::where('patient_id', $patientId)->pluck('id');
            $query->whereIn('dossier_patient_id', $dossierIds);
        }
        if ($request->filled('status')) {
            $statusMap = [
                'in-progress' => 'en_cours',
                'finished' => 'terminee',
                'cancelled' => 'annulee',
                'planned' => 'planifiee',
            ];
            $query->where('statut', $statusMap[$request->input('status')] ?? $request->input('status'));
        }

        $consultations = $query->orderByDesc('date')->limit(50)->get();
        $resources = $consultations->map(fn ($c) => $this->transformer->toEncounter($c))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $consultations->count()));
    }

    // ── Observation (Vital Signs) ────────────────────────────────────────────

    public function observationSearch(Request $request): JsonResponse
    {
        $query = Constante::query();

        if ($request->filled('patient')) {
            $patientId = $this->extractId($request->input('patient'));
            $dossierIds = DossierPatient::where('patient_id', $patientId)->pluck('id');
            $query->whereIn('dossier_patient_id', $dossierIds);
        }

        $constantes = $query->orderByDesc('created_at')->limit(20)->get();
        $resources = [];
        foreach ($constantes as $constante) {
            $resources = array_merge($resources, $this->transformer->toObservationBundle($constante));
        }

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', count($resources)));
    }

    // ── Condition (Diagnostics + Antécédents) ────────────────────────────────

    public function conditionSearch(Request $request): JsonResponse
    {
        $resources = [];

        $diagQuery = Diagnostic::query();
        $antQuery = Antecedent::query();

        if ($request->filled('patient')) {
            $patientId = $this->extractId($request->input('patient'));
            $dossierIds = DossierPatient::where('patient_id', $patientId)->pluck('id');
            $diagQuery->whereIn('dossier_patient_id', $dossierIds);
            $antQuery->whereIn('dossier_patient_id', $dossierIds);
        }

        $category = $request->input('category');
        if ($category !== 'problem-list-item') {
            $diagnostics = $diagQuery->limit(50)->get();
            foreach ($diagnostics as $d) {
                $resources[] = $this->transformer->toCondition($d);
            }
        }
        if ($category !== 'encounter-diagnosis') {
            $antecedents = $antQuery->limit(50)->get();
            foreach ($antecedents as $a) {
                $resources[] = $this->transformer->toConditionFromAntecedent($a);
            }
        }

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', count($resources)));
    }

    public function conditionRead(string $id): JsonResponse
    {
        if (str_starts_with($id, 'ant-')) {
            $antecedent = Antecedent::findOrFail((int) str_replace('ant-', '', $id));
            return $this->fhirResponse($this->transformer->toConditionFromAntecedent($antecedent));
        }

        $realId = str_starts_with($id, 'diag-') ? (int) str_replace('diag-', '', $id) : (int) $id;
        $diagnostic = Diagnostic::findOrFail($realId);
        return $this->fhirResponse($this->transformer->toCondition($diagnostic));
    }

    // ── AllergyIntolerance ───────────────────────────────────────────────────

    public function allergyIntoleranceRead(int $id): JsonResponse
    {
        $allergie = Allergie::findOrFail($id);
        return $this->fhirResponse($this->transformer->toAllergyIntolerance($allergie));
    }

    public function allergyIntoleranceSearch(Request $request): JsonResponse
    {
        $query = Allergie::query();

        if ($request->filled('patient')) {
            $patientId = $this->extractId($request->input('patient'));
            $dossierIds = DossierPatient::where('patient_id', $patientId)->pluck('id');
            $query->whereIn('dossier_patient_id', $dossierIds);
        }

        $allergies = $query->limit(50)->get();
        $resources = $allergies->map(fn ($a) => $this->transformer->toAllergyIntolerance($a))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $allergies->count()));
    }

    // ── MedicationRequest ────────────────────────────────────────────────────

    public function medicationRequestRead(int $id): JsonResponse
    {
        $prescription = Prescription::findOrFail($id);
        return $this->fhirResponse($this->transformer->toMedicationRequest($prescription));
    }

    public function medicationRequestSearch(Request $request): JsonResponse
    {
        $query = Prescription::query();

        if ($request->filled('patient')) {
            $patientId = $this->extractId($request->input('patient'));
            $dossierIds = DossierPatient::where('patient_id', $patientId)->pluck('id');
            $query->whereIn('dossier_patient_id', $dossierIds);
        }
        if ($request->filled('status')) {
            $query->where('statut', $request->input('status'));
        }

        $prescriptions = $query->orderByDesc('created_at')->limit(50)->get();
        $resources = $prescriptions->map(fn ($p) => $this->transformer->toMedicationRequest($p))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $prescriptions->count()));
    }

    // ── DiagnosticReport ─────────────────────────────────────────────────────

    public function diagnosticReportRead(int $id): JsonResponse
    {
        $examen = Examen::findOrFail($id);
        return $this->fhirResponse($this->transformer->toDiagnosticReport($examen));
    }

    public function diagnosticReportSearch(Request $request): JsonResponse
    {
        $query = Examen::query();

        if ($request->filled('patient')) {
            $patientId = $this->extractId($request->input('patient'));
            $dossierIds = DossierPatient::where('patient_id', $patientId)->pluck('id');
            $query->whereIn('dossier_patient_id', $dossierIds);
        }

        $examens = $query->orderByDesc('date_demande')->limit(50)->get();
        $resources = $examens->map(fn ($e) => $this->transformer->toDiagnosticReport($e))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $examens->count()));
    }

    // ── Appointment ──────────────────────────────────────────────────────────

    public function appointmentRead(int $id): JsonResponse
    {
        $rdv = RendezVous::findOrFail($id);
        return $this->fhirResponse($this->transformer->toAppointment($rdv));
    }

    public function appointmentSearch(Request $request): JsonResponse
    {
        $query = RendezVous::query();

        if ($request->filled('patient')) {
            $query->where('patient_id', $this->extractId($request->input('patient')));
        }
        if ($request->filled('status')) {
            $statusMap = [
                'booked' => 'confirme', 'pending' => 'en_attente',
                'arrived' => 'en_cours', 'fulfilled' => 'termine',
                'cancelled' => 'annule',
            ];
            $query->where('statut', $statusMap[$request->input('status')] ?? $request->input('status'));
        }

        $rdvs = $query->orderByDesc('date')->limit(50)->get();
        $resources = $rdvs->map(fn ($r) => $this->transformer->toAppointment($r))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $rdvs->count()));
    }

    // ── Consent ──────────────────────────────────────────────────────────────

    public function consentRead(int $id): JsonResponse
    {
        $consent = PatientConsent::findOrFail($id);
        return $this->fhirResponse($this->transformer->toConsent($consent));
    }

    public function consentSearch(Request $request): JsonResponse
    {
        $query = PatientConsent::query();

        if ($request->filled('patient')) {
            $query->where('patient_id', $this->extractId($request->input('patient')));
        }

        $consents = $query->orderByDesc('created_at')->limit(50)->get();
        $resources = $consents->map(fn ($c) => $this->transformer->toConsent($c))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $consents->count()));
    }

    // ── ImagingStudy ─────────────────────────────────────────────────────────

    public function imagingStudyRead(int $id): JsonResponse
    {
        $study = DicomStudy::findOrFail($id);
        return $this->fhirResponse($this->transformer->toImagingStudy($study));
    }

    public function imagingStudySearch(Request $request): JsonResponse
    {
        $query = DicomStudy::query();

        if ($request->filled('patient')) {
            $query->where('patient_id', $this->extractId($request->input('patient')));
        }
        if ($request->filled('modality')) {
            $query->where('modality', strtoupper($request->input('modality')));
        }
        if ($request->filled('status')) {
            $query->where('statut', $request->input('status'));
        }

        $studies = $query->orderByDesc('study_date')->limit(50)->get();
        $resources = $studies->map(fn ($s) => $this->transformer->toImagingStudy($s))->all();

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', $studies->count()));
    }

    // ── Patient $everything ──────────────────────────────────────────────────

    public function patientEverything(int $id): JsonResponse
    {
        $patient = Patient::with('dossier')->findOrFail($id);
        $dossierIds = DossierPatient::where('patient_id', $id)->pluck('id');

        $resources = [];

        // Patient
        $resources[] = $this->transformer->toPatient($patient);

        // Encounters
        $consultations = Consultation::with(['dossierPatient', 'user'])
            ->whereIn('dossier_patient_id', $dossierIds)->get();
        foreach ($consultations as $c) {
            $resources[] = $this->transformer->toEncounter($c);
        }

        // Observations
        $constantes = Constante::whereIn('dossier_patient_id', $dossierIds)->get();
        foreach ($constantes as $cst) {
            $resources = array_merge($resources, $this->transformer->toObservationBundle($cst));
        }

        // Conditions (diagnostics)
        $diagnostics = Diagnostic::whereIn('dossier_patient_id', $dossierIds)->get();
        foreach ($diagnostics as $d) {
            $resources[] = $this->transformer->toCondition($d);
        }

        // Conditions (antécédents)
        $antecedents = Antecedent::whereIn('dossier_patient_id', $dossierIds)->get();
        foreach ($antecedents as $a) {
            $resources[] = $this->transformer->toConditionFromAntecedent($a);
        }

        // Allergies
        $allergies = Allergie::whereIn('dossier_patient_id', $dossierIds)->get();
        foreach ($allergies as $al) {
            $resources[] = $this->transformer->toAllergyIntolerance($al);
        }

        // Prescriptions
        $prescriptions = Prescription::whereIn('dossier_patient_id', $dossierIds)->get();
        foreach ($prescriptions as $p) {
            $resources[] = $this->transformer->toMedicationRequest($p);
        }

        // Examens
        $examens = Examen::whereIn('dossier_patient_id', $dossierIds)->get();
        foreach ($examens as $e) {
            $resources[] = $this->transformer->toDiagnosticReport($e);
        }

        // Appointments
        $rdvs = RendezVous::where('patient_id', $id)->get();
        foreach ($rdvs as $r) {
            $resources[] = $this->transformer->toAppointment($r);
        }

        // Consents
        $consents = PatientConsent::where('patient_id', $id)->get();
        foreach ($consents as $consent) {
            $resources[] = $this->transformer->toConsent($consent);
        }

        // ImagingStudies (DICOM)
        $dicomStudies = DicomStudy::where('patient_id', $id)->get();
        foreach ($dicomStudies as $ds) {
            $resources[] = $this->transformer->toImagingStudy($ds);
        }

        return $this->fhirResponse($this->transformer->toBundle($resources, 'searchset', count($resources)));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function fhirResponse(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status)
            ->header('Content-Type', 'application/fhir+json; charset=utf-8');
    }

    private function extractId(string $ref): int
    {
        // Supporte "Patient/1" ou "1"
        $parts = explode('/', $ref);
        return (int) end($parts);
    }

    private function resourceCapability(string $type, array $interactions, array $searchParams = []): array
    {
        return [
            'type' => $type,
            'interaction' => array_map(fn ($i) => ['code' => $i], $interactions),
            'searchParam' => array_map(fn ($p) => [
                'name' => $p['name'],
                'type' => $p['type'],
            ], $searchParams),
        ];
    }
}
