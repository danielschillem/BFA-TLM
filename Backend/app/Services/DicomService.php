<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client DICOMweb pour dcm4chee-arc (https://github.com/dcm4che/dcm4che).
 *
 * Implémente les standards DICOMweb :
 *  - QIDO-RS (Query based on ID for DICOM Objects)
 *  - WADO-RS (Web Access to DICOM Objects)
 *  - STOW-RS (Store Over the Web)
 *
 * @see https://www.dicomstandard.org/using/dicomweb
 */
class DicomService
{
    private string $baseUrl;
    private string $wadoRs;
    private string $stowRs;
    private string $qidoRs;
    private int $timeout;

    public function __construct()
    {
        $config = config('services.dcm4chee');
        $this->baseUrl = rtrim($config['base_url'], '/');
        $this->wadoRs = $config['wado_rs'];
        $this->stowRs = $config['stow_rs'];
        $this->qidoRs = $config['qido_rs'];
        $this->timeout = $config['timeout'];
    }

    /**
     * Valide un UID DICOM pour prévenir les attaques SSRF / path traversal.
     * Un UID DICOM valide ne contient que des chiffres et des points.
     */
    private function validateDicomUid(string $uid): void
    {
        if (!preg_match('/^[0-9.]+$/', $uid)) {
            throw new \InvalidArgumentException("UID DICOM invalide : format non conforme.");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  QIDO-RS — Recherche d'études / séries / instances
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Rechercher des études DICOM (QIDO-RS).
     *
     * @param array $params Paramètres DICOM (PatientID, StudyDate, ModalitiesInStudy, etc.)
     * @return array Liste d'études au format JSON DICOM
     */
    public function searchStudies(array $params = []): array
    {
        $url = "{$this->baseUrl}{$this->qidoRs}/studies";

        $response = $this->client()
            ->accept('application/dicom+json')
            ->get($url, $params);

        return $this->handleResponse($response, 'QIDO-RS searchStudies');
    }

    /**
     * Rechercher des séries d'une étude.
     */
    public function searchSeries(string $studyUid, array $params = []): array
    {
        $this->validateDicomUid($studyUid);
        $url = "{$this->baseUrl}{$this->qidoRs}/studies/{$studyUid}/series";

        $response = $this->client()
            ->accept('application/dicom+json')
            ->get($url, $params);

        return $this->handleResponse($response, 'QIDO-RS searchSeries');
    }

    /**
     * Rechercher les instances d'une série.
     */
    public function searchInstances(string $studyUid, string $seriesUid, array $params = []): array
    {
        $this->validateDicomUid($studyUid);
        $this->validateDicomUid($seriesUid);
        $url = "{$this->baseUrl}{$this->qidoRs}/studies/{$studyUid}/series/{$seriesUid}/instances";

        $response = $this->client()
            ->accept('application/dicom+json')
            ->get($url, $params);

        return $this->handleResponse($response, 'QIDO-RS searchInstances');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  WADO-RS — Récupération d'études / séries / instances
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Récupérer les métadonnées d'une étude (WADO-RS metadata).
     */
    public function retrieveStudyMetadata(string $studyUid): array
    {
        $this->validateDicomUid($studyUid);
        $url = "{$this->baseUrl}{$this->wadoRs}/studies/{$studyUid}/metadata";

        $response = $this->client()
            ->accept('application/dicom+json')
            ->get($url);

        return $this->handleResponse($response, 'WADO-RS studyMetadata');
    }

    /**
     * Récupérer les métadonnées d'une série.
     */
    public function retrieveSeriesMetadata(string $studyUid, string $seriesUid): array
    {
        $this->validateDicomUid($studyUid);
        $this->validateDicomUid($seriesUid);
        $url = "{$this->baseUrl}{$this->wadoRs}/studies/{$studyUid}/series/{$seriesUid}/metadata";

        $response = $this->client()
            ->accept('application/dicom+json')
            ->get($url);

        return $this->handleResponse($response, 'WADO-RS seriesMetadata');
    }

    /**
     * Récupérer une instance (image) au format DICOM brut.
     * Retourne le contenu binaire (multipart/related; type=application/dicom).
     */
    public function retrieveInstance(string $studyUid, string $seriesUid, string $instanceUid): ?string
    {
        $this->validateDicomUid($studyUid);
        $this->validateDicomUid($seriesUid);
        $this->validateDicomUid($instanceUid);
        $url = "{$this->baseUrl}{$this->wadoRs}/studies/{$studyUid}/series/{$seriesUid}/instances/{$instanceUid}";

        $response = $this->client()
            ->accept('multipart/related; type=application/dicom')
            ->get($url);

        if ($response->successful()) {
            return $response->body();
        }

        Log::warning('DICOM WADO-RS retrieveInstance failed', [
            'url' => $url,
            'status' => $response->status(),
        ]);

        return null;
    }

    /**
     * Récupérer une frame JPEG/PNG (rendu image) via WADO-RS.
     */
    public function retrieveRenderedInstance(
        string $studyUid,
        string $seriesUid,
        string $instanceUid,
        int $frame = 1,
        string $mediaType = 'image/jpeg'
    ): ?string {
        $this->validateDicomUid($studyUid);
        $this->validateDicomUid($seriesUid);
        $this->validateDicomUid($instanceUid);
        $url = "{$this->baseUrl}{$this->wadoRs}/studies/{$studyUid}/series/{$seriesUid}/instances/{$instanceUid}/frames/{$frame}/rendered";

        $response = $this->client()
            ->accept($mediaType)
            ->get($url);

        if ($response->successful()) {
            return $response->body();
        }

        Log::warning('DICOM WADO-RS renderedInstance failed', [
            'url' => $url,
            'status' => $response->status(),
        ]);

        return null;
    }

    /**
     * Récupérer la miniature (thumbnail) d'une étude.
     */
    public function retrieveStudyThumbnail(string $studyUid): ?string
    {
        $this->validateDicomUid($studyUid);
        $url = "{$this->baseUrl}{$this->wadoRs}/studies/{$studyUid}/thumbnail";

        $response = $this->client()
            ->accept('image/jpeg')
            ->get($url);

        return $response->successful() ? $response->body() : null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  STOW-RS — Stockage d'instances DICOM
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Stocker un fichier DICOM sur le serveur dcm4chee-arc (STOW-RS).
     *
     * @param string $dicomBinaryContent Contenu binaire du fichier .dcm
     * @param string|null $studyUid Study UID cible (optionnel, le serveur l'extrait du fichier)
     * @return array Réponse du serveur (XML parsé en array)
     */
    public function storeInstance(string $dicomBinaryContent, ?string $studyUid = null): array
    {
        $url = "{$this->baseUrl}{$this->stowRs}/studies";
        if ($studyUid) {
            $this->validateDicomUid($studyUid);
            $url .= "/{$studyUid}";
        }

        $boundary = 'dicom-boundary-' . bin2hex(random_bytes(8));

        $body = "--{$boundary}\r\n"
            . "Content-Type: application/dicom\r\n\r\n"
            . $dicomBinaryContent
            . "\r\n--{$boundary}--\r\n";

        $response = $this->client()
            ->withBody($body, "multipart/related; type=application/dicom; boundary={$boundary}")
            ->post($url);

        return $this->handleResponse($response, 'STOW-RS storeInstance');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Utilitaires
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Vérifier la connexion au serveur dcm4chee-arc.
     */
    public function healthCheck(): array
    {
        try {
            $response = $this->client()
                ->accept('application/json')
                ->get("{$this->baseUrl}/monitor/serverTime");

            return [
                'status' => $response->successful() ? 'ok' : 'error',
                'http_code' => $response->status(),
                'base_url' => $this->baseUrl,
                'server_time' => $response->successful() ? $response->json() : null,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unreachable',
                'base_url' => $this->baseUrl,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Extraire les tags DICOM pertinents d'un résultat QIDO-RS.
     */
    public function extractStudyMetadata(array $dicomJson): array
    {
        return [
            'study_instance_uid' => $this->getTag($dicomJson, '0020000D'),
            'accession_number' => $this->getTag($dicomJson, '00080050'),
            'study_id' => $this->getTag($dicomJson, '00200010'),
            'study_description' => $this->getTag($dicomJson, '00081030'),
            'modality' => $this->getTag($dicomJson, '00080060'),
            'body_part_examined' => $this->getTag($dicomJson, '00180015'),
            'study_date' => $this->parseDicomDate(
                $this->getTag($dicomJson, '00080020'),
                $this->getTag($dicomJson, '00080030')
            ),
            'patient_dicom_id' => $this->getTag($dicomJson, '00100020'),
            'patient_dicom_name' => $this->formatDicomName($this->getTag($dicomJson, '00100010')),
            'number_of_series' => (int) ($this->getTag($dicomJson, '00201206') ?? 0),
            'number_of_instances' => (int) ($this->getTag($dicomJson, '00201208') ?? 0),
            'referring_physician' => $this->formatDicomName($this->getTag($dicomJson, '00080090')),
        ];
    }

    // ── Privé ────────────────────────────────────────────────────────────────

    private function client(): PendingRequest
    {
        $request = Http::timeout($this->timeout)->withOptions([
            'verify' => config('app.env') === 'production',
        ]);

        $auth = config('services.dcm4chee.auth');
        if ($auth['enabled'] && $auth['username']) {
            $request = $request->withBasicAuth($auth['username'], $auth['password']);
        }

        return $request;
    }

    private function handleResponse(Response $response, string $context): array
    {
        if ($response->successful()) {
            $data = $response->json();
            return is_array($data) ? $data : [];
        }

        Log::warning("DICOM {$context} failed", [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        return [];
    }

    /**
     * Extraire un tag DICOM du format JSON DICOM.
     * Format: { "00100020": { "vr": "LO", "Value": ["PAT001"] } }
     */
    private function getTag(array $dicomJson, string $tag): ?string
    {
        $tagData = $dicomJson[$tag] ?? null;
        if (!$tagData || !isset($tagData['Value'][0])) {
            return null;
        }

        $value = $tagData['Value'][0];

        // Le nom patient DICOM est un objet { "Alphabetic": "NAME" }
        if (is_array($value) && isset($value['Alphabetic'])) {
            return $value['Alphabetic'];
        }

        return is_string($value) ? $value : (string) $value;
    }

    /**
     * Convertir une date DICOM (YYYYMMDD) + heure (HHMMSS) en datetime.
     */
    private function parseDicomDate(?string $date, ?string $time = null): ?string
    {
        if (!$date || strlen($date) < 8) {
            return null;
        }

        $formatted = substr($date, 0, 4) . '-' . substr($date, 4, 2) . '-' . substr($date, 6, 2);

        if ($time && strlen($time) >= 4) {
            $formatted .= ' ' . substr($time, 0, 2) . ':' . substr($time, 2, 2) . ':00';
        }

        return $formatted;
    }

    /**
     * Formater un nom DICOM (LAST^FIRST^MIDDLE) en format lisible.
     */
    private function formatDicomName(?string $name): ?string
    {
        if (!$name) {
            return null;
        }

        $parts = explode('^', $name);
        return trim(implode(' ', array_reverse(array_filter($parts))));
    }
}
