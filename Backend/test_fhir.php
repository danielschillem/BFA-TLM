<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$t = new \App\Services\Fhir\FhirTransformer();

echo "=== Patient FHIR ===\n";
$p = \App\Models\Patient::with('dossier')->find(1);
$r = $t->toPatient($p);
echo "resourceType: {$r['resourceType']}\n";
echo "Name: {$r['name'][0]['given'][0]} {$r['name'][0]['family']}\n";
echo "MRN: {$r['identifier'][0]['value']}\n";
echo "Gender: {$r['gender']}\n";
echo "BirthDate: {$r['birthDate']}\n";

echo "\n=== Practitioner FHIR ===\n";
$u = \App\Models\User::find(3);
$pr = $t->toPractitioner($u);
echo "Name: {$pr['name'][0]['given'][0]} {$pr['name'][0]['family']}\n";
echo "Specialite: {$pr['qualification'][0]['code']['coding'][0]['code']}\n";
echo "Matricule: " . ($pr['identifier'][0]['value'] ?? 'N/A') . "\n";

echo "\n=== Organization FHIR ===\n";
$orgs = \App\Models\Structure::with('typeStructure')->take(3)->get();
foreach ($orgs as $o) {
    $fo = $t->toOrganization($o);
    echo "Org/{$fo['id']}: {$fo['name']} (active: " . ($fo['active'] ? 'yes' : 'no') . ")\n";
}

echo "\n=== Consent FHIR ===\n";
$consents = \App\Models\PatientConsent::where('patient_id', 1)->get();
foreach ($consents as $c) {
    $fc = $t->toConsent($c);
    echo "Consent/{$fc['id']}: status={$fc['status']} type={$fc['category'][0]['coding'][0]['code']} v{$fc['extension'][0]['valueInteger']}\n";
}

echo "\n=== Observation (Vital Signs) ===\n";
$constantes = \App\Models\Constante::where('dossier_patient_id', 1)->take(2)->get();
$obsCount = 0;
foreach ($constantes as $cst) {
    $obs = $t->toObservationBundle($cst);
    $obsCount += count($obs);
    foreach ($obs as $ob) {
        echo "Obs/{$ob['id']}: {$ob['code']['text']} = {$ob['valueQuantity']['value']} {$ob['valueQuantity']['unit']}\n";
    }
}
if ($obsCount === 0) echo "(aucune constante enregistree)\n";

echo "\n=== Encounter (Consultation) ===\n";
$dossierIds = \App\Models\DossierPatient::where('patient_id', 1)->pluck('id');
$consultations = \App\Models\Consultation::whereIn('dossier_patient_id', $dossierIds)->take(2)->get();
foreach ($consultations as $c) {
    $enc = $t->toEncounter($c);
    echo "Encounter/{$enc['id']}: status={$enc['status']} class={$enc['class']['code']}\n";
}
if ($consultations->isEmpty()) echo "(aucune consultation)\n";

echo "\n=== Patient/1/\$everything (counts) ===\n";
$diagCount = \App\Models\Diagnostic::whereIn('dossier_patient_id', $dossierIds)->count();
$rxCount = \App\Models\Prescription::whereIn('dossier_patient_id', $dossierIds)->count();
$exCount = \App\Models\Examen::whereIn('dossier_patient_id', $dossierIds)->count();
$alCount = \App\Models\Allergie::whereIn('dossier_patient_id', $dossierIds)->count();
$antCount = \App\Models\Antecedent::whereIn('dossier_patient_id', $dossierIds)->count();
$rdvCount = \App\Models\RendezVous::where('patient_id', 1)->count();
echo "Consultations: {$consultations->count()}, Diagnostics: {$diagCount}, Prescriptions: {$rxCount}\n";
echo "Examens: {$exCount}, Allergies: {$alCount}, Antecedents: {$antCount}, RDV: {$rdvCount}\n";
echo "Consents: {$consents->count()}\n";

echo "\n=== Bundle test ===\n";
$resources = [];
$resources[] = $t->toPatient($p);
foreach ($consultations as $c) {
    $resources[] = $t->toEncounter($c);
}
$bundle = $t->toBundle($resources);
echo "Bundle type: {$bundle['type']} | total: {$bundle['total']} | entries: " . count($bundle['entry']) . "\n";

echo "\nDONE - All FHIR transformers working!\n";
