<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DicomStudy;
use App\Services\DicomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DicomController extends Controller
{
    public function __construct(private DicomService $dicom)
    {
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Études DICOM (local + dcm4chee-arc)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Liste des études DICOM enregistrées dans TLM-BFA.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DicomStudy::with(['patient', 'examen', 'uploadedBy']);

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->integer('patient_id'));
        }
        if ($request->filled('modality')) {
            $query->where('modality', $request->input('modality'));
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->input('statut'));
        }
        if ($request->filled('consultation_id')) {
            $query->where('consultation_id', $request->integer('consultation_id'));
        }

        $studies = $query->orderByDesc('study_date')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $studies->through(fn ($s) => $this->formatStudy($s)),
            'meta' => [
                'current_page' => $studies->currentPage(),
                'last_page' => $studies->lastPage(),
                'total' => $studies->total(),
            ],
        ]);
    }

    /**
     * Détail d'une étude.
     */
    public function show(int $id): JsonResponse
    {
        $study = DicomStudy::with(['patient', 'examen', 'consultation', 'uploadedBy'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->formatStudy($study),
        ]);
    }

    /**
     * Synchroniser les études d'un patient depuis dcm4chee-arc (QIDO-RS).
     */
    public function syncFromPacs(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'patient_dicom_id' => ['required', 'string', 'max:64'],
        ]);

        $results = $this->dicom->searchStudies([
            'PatientID' => $request->input('patient_dicom_id'),
            'includefield' => 'all',
        ]);

        $synced = 0;
        foreach ($results as $dicomJson) {
            $meta = $this->dicom->extractStudyMetadata($dicomJson);

            if (!$meta['study_instance_uid']) {
                continue;
            }

            DicomStudy::updateOrCreate(
                ['study_instance_uid' => $meta['study_instance_uid']],
                [
                    ...$meta,
                    'patient_id' => $request->integer('patient_id'),
                ]
            );
            $synced++;
        }

        return response()->json([
            'success' => true,
            'message' => "{$synced} étude(s) synchronisée(s) depuis le PACS.",
            'synced_count' => $synced,
        ]);
    }

    /**
     * Enregistrer manuellement une étude (lien vers le PACS).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'study_instance_uid' => ['required', 'string', 'max:128', 'unique:dicom_studies,study_instance_uid'],
            'study_description' => ['nullable', 'string', 'max:255'],
            'modality' => ['required', 'string', 'max:16'],
            'body_part_examined' => ['nullable', 'string', 'max:64'],
            'study_date' => ['nullable', 'date'],
            'patient_id' => ['required', 'exists:patients,id'],
            'examen_id' => ['nullable', 'exists:examens,id'],
            'consultation_id' => ['nullable', 'exists:consultations,id'],
            'accession_number' => ['nullable', 'string', 'max:64'],
        ]);

        $study = DicomStudy::create([
            ...$validated,
            'uploaded_by' => $request->user()->id,
        ]);

        $study->load(['patient', 'examen', 'uploadedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Étude DICOM enregistrée.',
            'data' => $this->formatStudy($study),
        ], 201);
    }

    /**
     * Upload d'un fichier DICOM vers dcm4chee-arc (STOW-RS).
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:524288'], // 512 MB
            'patient_id' => ['required', 'exists:patients,id'],
            'examen_id' => ['nullable', 'exists:examens,id'],
            'consultation_id' => ['nullable', 'exists:consultations,id'],
        ]);

        $file = $request->file('file');
        $content = file_get_contents($file->getRealPath());

        // Envoyer au PACS via STOW-RS
        $result = $this->dicom->storeInstance($content);

        if (empty($result)) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi au serveur PACS. Vérifiez la connexion dcm4chee-arc.',
            ], 502);
        }

        // Tenter d'extraire le Study UID de la réponse ou du DICOM header
        $studyUid = $this->extractStudyUidFromStowResponse($result);

        // Si on a le UID, récupérer les métadonnées et créer l'enregistrement local
        $study = null;
        if ($studyUid) {
            $studies = $this->dicom->searchStudies([
                'StudyInstanceUID' => $studyUid,
                'includefield' => 'all',
            ]);

            if (!empty($studies[0])) {
                $meta = $this->dicom->extractStudyMetadata($studies[0]);
                $study = DicomStudy::updateOrCreate(
                    ['study_instance_uid' => $studyUid],
                    [
                        ...$meta,
                        'patient_id' => $request->integer('patient_id'),
                        'examen_id' => $request->input('examen_id'),
                        'consultation_id' => $request->input('consultation_id'),
                        'uploaded_by' => $request->user()->id,
                    ]
                );
                $study->load(['patient', 'examen', 'uploadedBy']);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Fichier DICOM envoyé au PACS.',
            'study_instance_uid' => $studyUid,
            'data' => $study ? $this->formatStudy($study) : null,
        ], 201);
    }

    /**
     * Mettre à jour le statut / interprétation d'une étude.
     */
    public function update(int $id, Request $request): JsonResponse
    {
        $study = DicomStudy::findOrFail($id);

        $validated = $request->validate([
            'statut' => ['nullable', 'in:recu,en_lecture,lu,valide'],
            'interpretation' => ['nullable', 'string', 'max:10000'],
            'patient_id' => ['nullable', 'exists:patients,id'],
            'examen_id' => ['nullable', 'exists:examens,id'],
            'consultation_id' => ['nullable', 'exists:consultations,id'],
        ]);

        $study->update($validated);
        $study->load(['patient', 'examen', 'consultation', 'uploadedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Étude mise à jour.',
            'data' => $this->formatStudy($study),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Proxy DICOMweb (WADO-RS) — pour le viewer frontend
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Proxy WADO-RS : séries d'une étude.
     */
    public function series(int $id): JsonResponse
    {
        $study = DicomStudy::findOrFail($id);
        $series = $this->dicom->searchSeries($study->study_instance_uid);

        return response()->json([
            'success' => true,
            'study_instance_uid' => $study->study_instance_uid,
            'data' => $series,
        ]);
    }

    /**
     * Proxy WADO-RS : instances d'une série.
     */
    public function instances(int $id, string $seriesUid): JsonResponse
    {
        $study = DicomStudy::findOrFail($id);
        $instances = $this->dicom->searchInstances($study->study_instance_uid, $seriesUid);

        return response()->json([
            'success' => true,
            'data' => $instances,
        ]);
    }

    /**
     * Proxy WADO-RS : image rendue (JPEG) pour affichage frontend.
     */
    public function renderFrame(int $id, string $seriesUid, string $instanceUid, int $frame = 1): Response
    {
        $study = DicomStudy::findOrFail($id);

        $imageData = $this->dicom->retrieveRenderedInstance(
            $study->study_instance_uid,
            $seriesUid,
            $instanceUid,
            $frame
        );

        if (!$imageData) {
            abort(404, 'Image DICOM non trouvée sur le PACS.');
        }

        return response($imageData, 200)
            ->header('Content-Type', 'image/jpeg')
            ->header('Cache-Control', 'private, max-age=3600');
    }

    /**
     * Miniature d'une étude.
     */
    public function thumbnail(int $id): Response
    {
        $study = DicomStudy::findOrFail($id);
        $image = $this->dicom->retrieveStudyThumbnail($study->study_instance_uid);

        if (!$image) {
            abort(404, 'Miniature non disponible.');
        }

        return response($image, 200)
            ->header('Content-Type', 'image/jpeg')
            ->header('Cache-Control', 'private, max-age=3600');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Santé du PACS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Vérifier la connexion au serveur dcm4chee-arc.
     */
    public function healthCheck(): JsonResponse
    {
        $health = $this->dicom->healthCheck();

        return response()->json([
            'success' => $health['status'] === 'ok',
            'data' => $health,
        ], $health['status'] === 'ok' ? 200 : 503);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Helpers privés
    // ═══════════════════════════════════════════════════════════════════════════

    private function formatStudy(DicomStudy $study): array
    {
        return [
            'id' => $study->id,
            'study_instance_uid' => $study->study_instance_uid,
            'accession_number' => $study->accession_number,
            'study_description' => $study->study_description,
            'modality' => $study->modality,
            'modality_label' => $study->modality_label,
            'body_part_examined' => $study->body_part_examined,
            'study_date' => $study->study_date?->toISOString(),
            'number_of_series' => $study->number_of_series,
            'number_of_instances' => $study->number_of_instances,
            'statut' => $study->statut,
            'interpretation' => $study->interpretation,
            'referring_physician' => $study->referring_physician,
            'wado_rs_url' => $study->wado_rs_url,
            'viewer_url' => $study->viewer_url,
            'patient' => $study->relationLoaded('patient') && $study->patient ? [
                'id' => $study->patient->id,
                'full_name' => $study->patient->full_name,
            ] : null,
            'examen' => $study->relationLoaded('examen') && $study->examen ? [
                'id' => $study->examen->id,
                'libelle' => $study->examen->libelle,
            ] : null,
            'consultation_id' => $study->consultation_id,
            'uploaded_by' => $study->relationLoaded('uploadedBy') && $study->uploadedBy ? [
                'id' => $study->uploadedBy->id,
                'name' => trim($study->uploadedBy->prenoms . ' ' . $study->uploadedBy->nom),
            ] : null,
            'created_at' => $study->created_at?->toISOString(),
        ];
    }

    private function extractStudyUidFromStowResponse(array $result): ?string
    {
        // dcm4chee-arc STOW-RS renvoie un XML/JSON avec les UIDs
        // Format: ReferencedSOPSequence → ReferencedStudySequence → StudyInstanceUID
        if (isset($result['00081190']['Value'][0])) {
            // WADO-RS URL dans la réponse → extraire le Study UID
            $url = $result['00081190']['Value'][0];
            if (preg_match('/studies\/([0-9.]+)/', $url, $matches)) {
                return $matches[1];
            }
        }

        return null;
    }
}
