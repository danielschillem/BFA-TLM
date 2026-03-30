<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$chapters = App\Models\Icd11Chapter::chapters()->get(['id','code','code_range','title','class_kind']);
foreach($chapters as $c) {
    echo $c->id . ' | ' . ($c->code_range ?? $c->code ?? '-') . ' | ' . $c->title . ' | ' . $c->class_kind . PHP_EOL;
}
echo PHP_EOL . 'Total: ' . $chapters->count() . ' chapitres' . PHP_EOL;
