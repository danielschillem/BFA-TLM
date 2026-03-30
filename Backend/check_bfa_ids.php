<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== PATIENTS ===" . PHP_EOL;
foreach (App\Models\Patient::all() as $p) {
    echo "  {$p->id} | {$p->ipp} | {$p->nom}" . PHP_EOL;
}

echo PHP_EOL . "=== DOSSIERS ===" . PHP_EOL;
foreach (App\Models\DossierPatient::all() as $d) {
    echo "  {$d->id} | {$d->identifiant}" . PHP_EOL;
}

echo PHP_EOL . "=== STRUCTURES ===" . PHP_EOL;
foreach (App\Models\Structure::all() as $s) {
    echo "  {$s->id} | {$s->code_structure} | {$s->libelle}" . PHP_EOL;
}

echo PHP_EOL . "=== UTILISATEURS ===" . PHP_EOL;
foreach (App\Models\User::all() as $u) {
    $type = $u->specialite ? 'PS' : 'USR';
    echo "  {$u->id} | {$u->identifiant_national} | {$u->nom} [{$type}]" . PHP_EOL;
}
