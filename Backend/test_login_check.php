<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$email = 'dr.sawadogo@tlm-bfa.bf';
$u = \App\Models\User::where('email', $email)->first();
echo "User found: " . ($u ? 'YES' : 'NO') . "\n";
if ($u) {
    echo "Status: " . $u->status . "\n";
    echo "Password hash check: " . (\Illuminate\Support\Facades\Hash::check('password', $u->password) ? 'OK' : 'FAIL') . "\n";
}

// List all users
echo "\nAll users:\n";
foreach (\App\Models\User::all(['id','email','status']) as $user) {
    echo "  #{$user->id} {$user->email} ({$user->status})\n";
}
