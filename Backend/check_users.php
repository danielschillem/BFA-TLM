<?php
// Quick health check
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo '=== CORS Config ===' . PHP_EOL;
$cors = config('cors');
echo 'Origins: ' . json_encode($cors['allowed_origins']) . PHP_EOL;

echo PHP_EOL . '=== Login Test ===' . PHP_EOL;
$user = \App\Models\User::where('email', 'dr.sawadogo@tlm-bfa.bf')->first();
if ($user) {
    $ok = \Illuminate\Support\Facades\Hash::check('password', $user->password);
    echo "User: {$user->nom} — Password: " . ($ok ? 'OK' : 'FAIL') . PHP_EOL;
    if ($ok) {
        $token = $user->createToken('test')->accessToken;
        echo 'Token: ' . substr($token, 0, 20) . '... (' . strlen($token) . ' chars)' . PHP_EOL;
    }
} else {
    echo 'NO USER FOUND' . PHP_EOL;
}

echo PHP_EOL . '=== Passport Clients ===' . PHP_EOL;
$clients = \Laravel\Passport\Client::all();
echo $clients->count() . ' clients' . PHP_EOL;
foreach ($clients as $c) {
    echo "  {$c->id} — {$c->name} (personal: " . ($c->personal_access_client ? 'yes' : 'no') . ")" . PHP_EOL;
}
exit;
