<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo '=== Users in DB ===' . PHP_EOL;
$users = \App\Models\User::select('id', 'email', 'nom')->get();
echo $users->count() . ' users' . PHP_EOL;
foreach ($users as $u) {
    echo "  {$u->id} {$u->email} ({$u->nom})" . PHP_EOL;
}

echo PHP_EOL . '=== Login test ===' . PHP_EOL;
$user = \App\Models\User::where('email', 'dr.sawadogo@tlm-bfa.bf')->first();
if (!$user) {
    echo 'User NOT FOUND - re-seeding...' . PHP_EOL;
    \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
    echo \Illuminate\Support\Facades\Artisan::output();
    $user = \App\Models\User::where('email', 'dr.sawadogo@tlm-bfa.bf')->first();
}

if ($user) {
    $pwOk = \Illuminate\Support\Facades\Hash::check('password', $user->password);
    echo "User found: {$user->nom} {$user->prenoms}" . PHP_EOL;
    echo "Password check: " . ($pwOk ? 'OK' : 'FAILED') . PHP_EOL;
    if ($pwOk) {
        $token = $user->createToken('test')->accessToken;
        echo 'Token length: ' . strlen($token) . PHP_EOL;
        echo 'LOGIN SUCCESS' . PHP_EOL;
    }
} else {
    echo 'User still not found after seeding' . PHP_EOL;
}
