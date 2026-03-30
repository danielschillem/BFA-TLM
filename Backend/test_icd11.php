<?php

/**
 * Script de test ICD-11 WHO API.
 * Usage : php test_icd11.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\Icd11Service;

$icd11 = app(Icd11Service::class);

$pass = 0;
$fail = 0;

function test(string $label, callable $fn): void
{
    global $pass, $fail;
    echo "\n── {$label} ";
    try {
        $result = $fn();
        echo "✓\n";
        if (is_array($result)) {
            echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        }
        $pass++;
    } catch (\Throwable $e) {
        echo "✗\n";
        echo "  ERREUR: {$e->getMessage()}\n";
        $fail++;
    }
}

// ──────────────────────────────────────────────────────────────────────────────

test('1. Health check API ICD-11', function () use ($icd11) {
    $result = $icd11->healthCheck();
    assert($result['status'] === 'ok', 'Health check doit retourner ok');
    return $result;
});

test('2. Recherche "paludisme"', function () use ($icd11) {
    $result = $icd11->search('paludisme', flexibleSearch: true, flatResults: 5);
    assert(!empty($result['results']), 'Recherche doit retourner des résultats');
    echo "  → {$result['total']} résultats trouvés\n";
    foreach (array_slice($result['results'], 0, 3) as $r) {
        echo "    [{$r['code']}] {$r['title']}\n";
    }
    return ['total' => $result['total'], 'first_code' => $result['results'][0]['code'] ?? null];
});

test('3. Recherche "diabète type 2"', function () use ($icd11) {
    $result = $icd11->search('diabète type 2', flatResults: 5);
    assert(!empty($result['results']), 'Recherche diabète doit retourner des résultats');
    foreach (array_slice($result['results'], 0, 3) as $r) {
        echo "    [{$r['code']}] {$r['title']}\n";
    }
    return ['total' => $result['total']];
});

test('4. Lookup code "5A11" (Diabète type 2)', function () use ($icd11) {
    $entity = $icd11->lookup('5A11');
    assert(!empty($entity['code']), 'Lookup doit retourner un code');
    assert(!empty($entity['title']), 'Lookup doit retourner un titre');
    return [
        'code' => $entity['code'],
        'title' => $entity['title'],
        'definition' => substr($entity['definition'] ?? 'N/A', 0, 100),
    ];
});

test('5. Validate code "5A11"', function () use ($icd11) {
    $result = $icd11->validate('5A11');
    assert($result['valid'] === true, 'Code 5A11 doit être valide');
    return $result;
});

test('6. Validate code invalide "ZZZZZ"', function () use ($icd11) {
    $result = $icd11->validate('ZZZZZ');
    assert($result['valid'] === false, 'Code ZZZZZ doit être invalide');
    return $result;
});

test('7. Crosswalk ICD-10 "E11.9" → ICD-11', function () use ($icd11) {
    $result = $icd11->crosswalkFromIcd10('E11.9');
    echo "  → found: " . ($result['found'] ? 'oui' : 'non') . "\n";
    if ($result['found']) {
        echo "  → ICD-11: [{$result['icd11_code']}] {$result['icd11_title']}\n";
    }
    return $result;
});

test('8. Recherche "hypertension artérielle"', function () use ($icd11) {
    $result = $icd11->search('hypertension artérielle', flatResults: 3);
    assert(!empty($result['results']), 'Recherche HTA doit retourner des résultats');
    foreach ($result['results'] as $r) {
        echo "    [{$r['code']}] {$r['title']}\n";
    }
    return ['total' => $result['total']];
});

// ──────────────────────────────────────────────────────────────────────────────

echo "\n" . str_repeat('═', 60) . "\n";
echo "RÉSULTATS : {$pass} réussi(s), {$fail} échoué(s)\n";
echo str_repeat('═', 60) . "\n";

exit($fail > 0 ? 1 : 0);
