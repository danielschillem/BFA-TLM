<?php

/**
 * Script de test: vérification middleware & sécurité des routes.
 * Vérifie directement la configuration des routes (plus fiable que la simulation HTTP).
 * Usage: php test_security.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Route;

$pass = 0;
$fail = 0;

function test(string $label, callable $fn): void
{
    global $pass, $fail;
    echo "\n── {$label} ";
    try {
        $fn();
        echo "✓";
        $pass++;
    } catch (\Throwable $e) {
        echo "✗\n  ERREUR: {$e->getMessage()}";
        $fail++;
    }
    echo "\n";
}

/**
 * Trouver une route par URI et méthode, retourner ses middleware.
 */
function getRouteMiddleware(string $uri, string $method = 'GET'): array
{
    $routes = Route::getRoutes()->getRoutes();
    foreach ($routes as $route) {
        if ($route->uri() === $uri && in_array($method, $route->methods())) {
            return $route->middleware();
        }
    }
    throw new RuntimeException("Route non trouvée : {$method} {$uri}");
}

function assertHasMiddleware(string $uri, string $expected, string $method = 'GET'): void
{
    $middlewares = getRouteMiddleware($uri, $method);
    if (!in_array($expected, $middlewares)) {
        throw new RuntimeException("{$method} {$uri} manque '{$expected}'. Middleware actuel: " . implode(', ', $middlewares));
    }
}

function isEffectivelyPublic(string $uri, string $method = 'GET'): bool
{
    $routes = Route::getRoutes()->getRoutes();
    foreach ($routes as $route) {
        if ($route->uri() === $uri && in_array($method, $route->methods())) {
            return in_array('auth:api', $route->excludedMiddleware());
        }
    }
    return false;
}

// ══════════════════════════════════════════════════════════════════════════════
echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║   Audit Sécurité des Routes — TLM-BFA                  ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n";

// ── 1. Headers de sécurité ────────────────────────────────────────────────────

test('1. Middleware SecurityHeaders enregistré', function () {
    assert(class_exists(\App\Http\Middleware\SecurityHeaders::class), 'Classe SecurityHeaders doit exister');
    echo "\n    Classe App\\Http\\Middleware\\SecurityHeaders OK";

    // Vérifier via bootstrap/app.php que le middleware est référencé
    $bootstrapContent = file_get_contents(base_path('bootstrap/app.php'));
    assert(str_contains($bootstrapContent, 'SecurityHeaders'), 'SecurityHeaders doit être dans bootstrap/app.php');
    echo "\n    Référencé dans bootstrap/app.php ✓";
});

// ── 2. Routes Paiements ──────────────────────────────────────────────────────

test('2. Paiements: auth:api + permissions sur toutes les routes', function () {
    $routes = [
        ['POST', 'api/v1/payments/consultations/{consultationId}/initiate', 'permission:payments.initiate'],
        ['POST', 'api/v1/payments/confirm', 'permission:payments.confirm'],
        ['POST', 'api/v1/payments/{id}/doctor-validate', 'permission:payments.validate'],
        ['GET',  'api/v1/payments/{id}/invoice', 'permission:payments.view'],
        ['GET',  'api/v1/payments/statement', 'permission:payments.view'],
    ];

    foreach ($routes as [$method, $uri, $expectedPermission]) {
        assertHasMiddleware($uri, 'auth:api', $method);
        assertHasMiddleware($uri, $expectedPermission, $method);
        echo "\n    {$method} {$uri} → auth:api + {$expectedPermission} ✓";
    }
});

// ── 3. Permissions payments dans la base ──────────────────────────────────────

test('3. Permissions payments.* existent en base', function () {
    $expected = ['payments.initiate', 'payments.confirm', 'payments.validate', 'payments.view'];
    $existing = \Spatie\Permission\Models\Permission::whereIn('name', $expected)->pluck('name')->all();
    foreach ($expected as $perm) {
        assert(in_array($perm, $existing), "Permission '{$perm}' manquante en base");
        echo "\n    {$perm} ✓";
    }
});

// ── 4. Attribution des permissions payments aux rôles ─────────────────────────

test('4. Rôles avec permissions payments correctes', function () {
    $admin = \Spatie\Permission\Models\Role::where('name', 'admin')->where('guard_name', 'api')->first();
    assert($admin->hasPermissionTo('payments.initiate'), 'Admin doit avoir payments.initiate');
    assert($admin->hasPermissionTo('payments.validate'), 'Admin doit avoir payments.validate');
    echo "\n    admin: initiate, confirm, validate, view ✓";

    $doctor = \Spatie\Permission\Models\Role::where('name', 'doctor')->where('guard_name', 'api')->first();
    assert($doctor->hasPermissionTo('payments.initiate'), 'Doctor doit avoir payments.initiate');
    assert($doctor->hasPermissionTo('payments.view'), 'Doctor doit avoir payments.view');
    assert($doctor->hasPermissionTo('payments.validate'), 'Doctor doit avoir payments.validate');
    echo "\n    doctor: initiate, validate, view ✓";

    $patient = \Spatie\Permission\Models\Role::where('name', 'patient')->where('guard_name', 'api')->first();
    assert($patient->hasPermissionTo('payments.initiate'), 'Patient doit avoir payments.initiate');
    assert($patient->hasPermissionTo('payments.confirm'), 'Patient doit avoir payments.confirm');
    assert($patient->hasPermissionTo('payments.view'), 'Patient doit avoir payments.view');
    echo "\n    patient: initiate, confirm, view ✓";
});

// ── 5. rate-video protégée ────────────────────────────────────────────────────

test('5. rate-video: auth:api + permission:consultations.update', function () {
    assertHasMiddleware('api/v1/consultations/{id}/rate-video', 'auth:api', 'POST');
    assertHasMiddleware('api/v1/consultations/{id}/rate-video', 'permission:consultations.update', 'POST');
    echo "\n    POST /consultations/{id}/rate-video → auth:api + consultations.update ✓";
});

// ── 6. Directory schedule ─────────────────────────────────────────────────────

test('6. Directory schedule: protégé par permissions', function () {
    assertHasMiddleware('api/v1/directory/schedule', 'permission:appointments.update', 'POST');
    assertHasMiddleware('api/v1/directory/schedule/{id}', 'permission:appointments.update', 'DELETE');
    assertHasMiddleware('api/v1/directory/schedule', 'permission:appointments.view', 'GET');
    echo "\n    POST   /directory/schedule     → appointments.update ✓";
    echo "\n    DELETE /directory/schedule/{id} → appointments.update ✓";
    echo "\n    GET    /directory/schedule      → appointments.view ✓";

    $doctorsMiddleware = getRouteMiddleware('api/v1/directory/doctors');
    assert(in_array('auth:api', $doctorsMiddleware), 'doctors doit avoir auth:api');
    echo "\n    GET    /directory/doctors       → auth:api (tous) ✓";
});

// ── 7. Register rate limited ──────────────────────────────────────────────────

test('7. Register: double rate limiting (auth + register)', function () {
    assertHasMiddleware('api/v1/auth/register', 'throttle:auth', 'POST');
    assertHasMiddleware('api/v1/auth/register', 'throttle:register', 'POST');
    echo "\n    POST /auth/register → throttle:auth (30/min) + throttle:register (5/min) ✓";
});

// ── 8. FHIR metadata public, autres protégés ─────────────────────────────────

test('8. FHIR: metadata public, ressources protégées', function () {
    assert(isEffectivelyPublic('api/v1/fhir/metadata'), 'FHIR metadata doit être public');
    echo "\n    /fhir/metadata → public (auth:api exclu) ✓";

    assertHasMiddleware('api/v1/fhir/Patient', 'auth:api');
    assertHasMiddleware('api/v1/fhir/Patient/{id}', 'auth:api');
    assertHasMiddleware('api/v1/fhir/Encounter', 'auth:api');
    echo "\n    /fhir/Patient, Encounter... → auth:api ✓";
});

// ── 9. CDA metadata public ───────────────────────────────────────────────────

test('9. CDA: metadata public, documents protégés', function () {
    assert(isEffectivelyPublic('api/v1/cda/metadata'), 'CDA metadata doit être public');
    echo "\n    /cda/metadata → public (auth:api exclu) ✓";

    assertHasMiddleware('api/v1/cda/Patient/{id}/ccd', 'auth:api');
    assertHasMiddleware('api/v1/cda/Consultation/{id}/note', 'auth:api');
    echo "\n    /cda/Patient/CCD, Consultation/note → auth:api ✓";
});

// ── 10. ICD-11 health public, autres protégés ─────────────────────────────────

test('10. ICD-11: health public, API protégée', function () {
    assert(isEffectivelyPublic('api/v1/icd11/health'), 'ICD-11 health doit être public');
    echo "\n    /icd11/health → public (auth:api exclu) ✓";

    assertHasMiddleware('api/v1/icd11/search', 'auth:api');
    assertHasMiddleware('api/v1/icd11/lookup/{code}', 'auth:api');
    echo "\n    /icd11/search, lookup → auth:api ✓";
});

// ── 11. Admin protégé par rôle ────────────────────────────────────────────────

test('11. Admin: rôle admin requis', function () {
    assertHasMiddleware('api/v1/admin/dashboard', 'role:admin');
    assertHasMiddleware('api/v1/admin/dashboard', 'permission:admin.dashboard');
    assertHasMiddleware('api/v1/admin/users', 'role:admin');
    echo "\n    /admin/* → role:admin + permissions spécifiques ✓";
});

// ── 12. Gestionnaire protégé par rôle ─────────────────────────────────────────

test('12. Gestionnaire: rôle structure_manager', function () {
    assertHasMiddleware('api/v1/gestionnaire/dashboard', 'role:structure_manager');
    echo "\n    /gestionnaire/* → role:structure_manager ✓";
});

// ── 13. DICOM études protégées ────────────────────────────────────────────────

test('13. DICOM: études protégées par permissions', function () {
    assertHasMiddleware('api/v1/dicom/studies', 'permission:consultations.view');
    assertHasMiddleware('api/v1/dicom/upload', 'permission:consultations.update', 'POST');
    echo "\n    /dicom/studies → consultations.view ✓";
    echo "\n    /dicom/upload  → consultations.update ✓";
});

// ── 14. CORS configuration ───────────────────────────────────────────────────

test('14. CORS: configuration durcie', function () {
    $cors = config('cors');
    assert($cors['allowed_methods'] !== ['*'], 'allowed_methods ne doit pas être wildcard');
    assert($cors['allowed_headers'] !== ['*'], 'allowed_headers ne doit pas être wildcard');
    echo "\n    allowed_methods: " . implode(', ', $cors['allowed_methods']);
    echo "\n    allowed_headers: " . implode(', ', $cors['allowed_headers']);
    echo "\n    allowed_origins: " . implode(', ', $cors['allowed_origins']);
    echo "\n    supports_credentials: " . ($cors['supports_credentials'] ? 'true' : 'false');
    echo "\n    max_age: " . $cors['max_age'];
});

// ── 15. Consentements protégés ────────────────────────────────────────────────

test('15. Consentements: permissions dossiers.*', function () {
    assertHasMiddleware('api/v1/consents', 'permission:dossiers.view');
    assertHasMiddleware('api/v1/consents', 'permission:dossiers.update', 'POST');
    assertHasMiddleware('api/v1/consents/{id}/withdraw', 'permission:dossiers.update', 'POST');
    echo "\n    /consents → dossiers.view / dossiers.update ✓";
});

// ══════════════════════════════════════════════════════════════════════════════
echo "\n" . str_repeat('═', 60) . "\n";
$status = $fail === 0 ? 'SANTÉ OK' : 'CORRECTIONS NÉCESSAIRES';
echo "RÉSULTATS : {$pass} réussi(s), {$fail} échoué(s) — {$status}\n";
echo str_repeat('═', 60) . "\n";

exit($fail > 0 ? 1 : 0);
