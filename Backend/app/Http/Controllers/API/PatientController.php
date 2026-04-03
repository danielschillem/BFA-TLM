<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\AuthorizesStructureAccess;
use App\Http\Requests\StorePatientRequest;
use App\Http\Resources\DossierPatientResource;
use App\Http\Resources\PatientResource;
use App\Models\DossierPatient;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    use AuthorizesStructureAccess;

    public function index(Request $request): JsonResponse
    {
        $patients = $this->scopeByStructure(Patient::with('dossier'))
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => PatientResource::collection($patients),
            'meta' => [
                'pagination' => [
                    'current_page' => $patients->currentPage(),
                    'last_page' => $patients->lastPage(),
                    'per_page' => $patients->perPage(),
                    'total' => $patients->total(),
                ],
            ],
        ]);
    }

    public function store(StorePatientRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Traçabilité : enregistrer le PS créateur et sa structure
        $creator = $request->user();
        $patient = new Patient($data);
        $patient->created_by_id = $creator->id;
        $patient->structure_id = $creator->structure_id;
        $patient->save();

        DossierPatient::create([
            'identifiant' => 'DOS-' . str_pad($patient->id, 6, '0', STR_PAD_LEFT),
            'statut' => 'ouvert',
            'date_ouverture' => now(),
            'patient_id' => $patient->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Patient créé',
            'data' => new PatientResource($patient->load('dossier')),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $patient = Patient::with('dossier')->findOrFail($id);
        $this->authorizePatientAccess($patient);

        return response()->json([
            'success' => true,
            'data' => new PatientResource($patient),
        ]);
    }

    public function update(StorePatientRequest $request, int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $this->authorizePatientAccess($patient);
        $patient->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Patient mis à jour',
            'data' => new PatientResource($patient->fresh()->load('dossier')),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $this->authorizePatientAccess($patient);
        $patient->delete();

        return response()->json([
            'success' => true,
            'message' => 'Patient supprimé',
        ]);
    }

    public function getRecord(int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $this->authorizePatientAccess($patient);

        $dossier = DossierPatient::with([
            'patient',
            'antecedents',
            'constantes.user',
            'consultations.user',
            'consultations.diagnostics',
            'consultations.prescriptions',
            'consultations.examens',
            'consultations.traitements',
            'allergies',
            'prescriptions',
            'diagnostics',
            'examens',
            'examensCliniques.systemes',
            'examensCliniques.user',
            'habitudesDeVie',
            'antecedentsMedicamenteux',
        ])
            ->where('patient_id', $patientId)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new DossierPatientResource($dossier),
        ]);
    }

    public function updateRecord(int $patientId, Request $request): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $this->authorizePatientAccess($patient);

        $request->validate([
            'groupe_sanguin'     => 'nullable|string|max:10',
            'notes_importantes'  => 'nullable|string|max:5000',
        ]);

        $dossier = DossierPatient::where('patient_id', $patientId)->firstOrFail();
        $dossier->update($request->only(['groupe_sanguin', 'notes_importantes']));

        return response()->json([
            'success' => true,
            'message' => 'Dossier mis à jour',
            'data' => new DossierPatientResource($dossier->fresh()),
        ]);
    }
}
