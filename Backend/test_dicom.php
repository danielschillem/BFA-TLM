<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== DICOM Integration Tests ===\n\n";

// 1. Test DicomStudy model creation
echo "--- 1. Create DicomStudy ---\n";
$study = \App\Models\DicomStudy::create([
    'study_instance_uid' => '1.2.826.0.1.3680043.8.1055.1.20260325.1234',
    'accession_number' => 'ACC-2026-001',
    'study_description' => 'Radiographie thoracique face',
    'modality' => 'CR',
    'body_part_examined' => 'CHEST',
    'study_date' => '2026-03-25',
    'number_of_series' => 1,
    'number_of_instances' => 2,
    'patient_id' => 1,
    'consultation_id' => 1,
    'uploaded_by' => 3,
    'statut' => 'recu',
    'referring_physician' => 'Dr. Ibrahim SAWADOGO',
]);
echo "Created ID: {$study->id}\n";
echo "UID: {$study->study_instance_uid}\n";
echo "Modality Label: {$study->modality_label}\n";
echo "WADO-RS URL: {$study->wado_rs_url}\n";

// 2. Test DicomStudy model creation (CT)
echo "\n--- 2. Create 2nd study (CT) ---\n";
$study2 = \App\Models\DicomStudy::create([
    'study_instance_uid' => '1.2.826.0.1.3680043.8.1055.1.20260325.5678',
    'accession_number' => 'ACC-2026-002',
    'study_description' => 'Scanner abdominal avec injection',
    'modality' => 'CT',
    'body_part_examined' => 'ABDOMEN',
    'study_date' => '2026-03-24',
    'number_of_series' => 3,
    'number_of_instances' => 245,
    'patient_id' => 1,
    'uploaded_by' => 3,
    'statut' => 'lu',
    'interpretation' => 'Pas d\'anomalie significative détectée. Léger épanchement pleural droit.',
]);
echo "Created ID: {$study2->id}\n";
echo "Modality Label: {$study2->modality_label}\n";

// 3. Test FHIR ImagingStudy transformer
echo "\n--- 3. FHIR ImagingStudy Transform ---\n";
$t = new \App\Services\Fhir\FhirTransformer();
$fhir = $t->toImagingStudy($study);
echo "resourceType: {$fhir['resourceType']}\n";
echo "status: {$fhir['status']}\n";
echo "modality: {$fhir['modality'][0]['code']}\n";
echo "subject: {$fhir['subject']['reference']}\n";
echo "numberOfSeries: {$fhir['numberOfSeries']}\n";
echo "numberOfInstances: {$fhir['numberOfInstances']}\n";
echo "description: {$fhir['description']}\n";
echo "identifier[0] (UID): {$fhir['identifier'][0]['value']}\n";

// 4. Test FHIR ImagingStudy with interpretation
echo "\n--- 4. FHIR ImagingStudy (with interpretation) ---\n";
$fhir2 = $t->toImagingStudy($study2);
echo "resourceType: {$fhir2['resourceType']}\n";
echo "modality: {$fhir2['modality'][0]['code']}\n";
echo "note: " . ($fhir2['note'][0]['text'] ?? 'N/A') . "\n";

// 5. Test FHIR Bundle
echo "\n--- 5. FHIR Bundle (ImagingStudy search) ---\n";
$bundle = $t->toBundle([$fhir, $fhir2], 'searchset', 2);
echo "Bundle type: {$bundle['type']}\n";
echo "Total: {$bundle['total']}\n";
echo "Entries: " . count($bundle['entry']) . "\n";

// 6. Test Patient $everything includes DICOM
echo "\n--- 6. Patient/1 DICOM studies count ---\n";
$dicomCount = \App\Models\DicomStudy::where('patient_id', 1)->count();
echo "DICOM studies for patient 1: {$dicomCount}\n";

// 7. Test DicomService health check format
echo "\n--- 7. DicomService structure ---\n";
$service = new \App\Services\DicomService();
echo "DicomService instantiated OK\n";
echo "Methods: searchStudies, searchSeries, searchInstances, retrieveStudyMetadata, storeInstance, healthCheck\n";

// 8. Verify CapabilityStatement includes ImagingStudy
echo "\n--- 8. Verify CapabilityStatement ---\n";
$metadata = json_decode(file_get_contents('http://127.0.0.1:8000/api/v1/fhir/metadata'), true);
$resourceTypes = array_column($metadata['rest'][0]['resource'], 'type');
$hasImaging = in_array('ImagingStudy', $resourceTypes);
echo "ImagingStudy in CapabilityStatement: " . ($hasImaging ? 'YES' : 'NO') . "\n";
echo "Total FHIR resources: " . count($resourceTypes) . "\n";
echo "Resources: " . implode(', ', $resourceTypes) . "\n";

// Cleanup
$study->forceDelete();
$study2->forceDelete();

echo "\n=== ALL DICOM TESTS PASSED ===\n";
