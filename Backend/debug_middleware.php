<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$check = ['api/v1/fhir/metadata', 'api/v1/cda/metadata', 'api/v1/icd11/health'];
$routes = \Illuminate\Support\Facades\Route::getRoutes()->getRoutes();
foreach ($routes as $r) {
    if (in_array($r->uri(), $check)) {
        echo $r->uri() . PHP_EOL;
        echo '  middleware: ' . implode(', ', $r->middleware()) . PHP_EOL;
        echo '  excluded: ' . implode(', ', $r->excludedMiddleware()) . PHP_EOL;
    }
}
