<?php

namespace App\Console\Commands;

use App\Models\Icd11Chapter;
use App\Services\Icd11Service;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportIcd11Chapters extends Command
{
    protected $signature = 'icd11:import
                            {--depth=2 : Profondeur max à importer (0=chapitres, 1=+blocs, 2=+catégories, etc.)}
                            {--fresh : Vider la table avant l\'import}';

    protected $description = 'Importer la hiérarchie ICD-11 (chapitres, blocs, catégories) depuis l\'API OMS';

    private Icd11Service $icd11;
    private int $maxDepth;
    private int $imported = 0;
    private int $errors = 0;

    public function handle(Icd11Service $icd11): int
    {
        $this->icd11 = $icd11;
        $this->maxDepth = (int) $this->option('depth');

        $this->info("═══════════════════════════════════════════════════════════════");
        $this->info("  Import ICD-11 — profondeur max : {$this->maxDepth}");
        $this->info("═══════════════════════════════════════════════════════════════");

        // Vérifier la connexion API
        $this->info('Vérification de la connexion API OMS ICD-11…');
        try {
            $root = $this->icd11->getLinearizationRoot();
        } catch (\Exception $e) {
            $this->error('Impossible de se connecter à l\'API ICD-11 : ' . $e->getMessage());
            $this->error('Vérifiez ICD11_CLIENT_ID et ICD11_CLIENT_SECRET dans .env');
            return self::FAILURE;
        }

        $this->info("Linéarisation : {$root['title']} (release: {$root['release_id']})");
        $chapterUris = $root['children'];
        $this->info(count($chapterUris) . ' chapitres trouvés à la racine.');
        $this->newLine();

        if ($this->option('fresh')) {
            $this->warn('Suppression des données existantes…');
            Icd11Chapter::truncate();
        }

        $bar = $this->output->createProgressBar(count($chapterUris));
        $bar->setFormat(" %current%/%max% [%bar%] %percent:3s%% — %message%");
        $bar->setMessage('Démarrage…');
        $bar->start();

        foreach ($chapterUris as $index => $chapterUri) {
            $bar->setMessage("Chapitre " . ($index + 1));
            $this->importEntity($chapterUri, null, 0, $index);
            $bar->advance();
        }

        $bar->setMessage('Terminé !');
        $bar->finish();
        $this->newLine(2);

        $this->info("══════════════════════════════════════════════════");
        $this->info("  Résultat : {$this->imported} entités importées");
        if ($this->errors > 0) {
            $this->warn("  Erreurs : {$this->errors} (voir logs)");
        }
        $this->info("══════════════════════════════════════════════════");

        // Résumé par profondeur
        $depths = Icd11Chapter::selectRaw('depth, count(*) as total')
            ->groupBy('depth')
            ->orderBy('depth')
            ->pluck('total', 'depth');

        $labels = ['Chapitres', 'Blocs', 'Catégories', 'Sous-catégories'];
        foreach ($depths as $depth => $count) {
            $label = $labels[$depth] ?? "Niveau {$depth}";
            $this->line("  • {$label} : {$count}");
        }

        return self::SUCCESS;
    }

    private function importEntity(string $uri, ?int $parentId, int $depth, int $sortOrder): void
    {
        // Ne pas dépasser la profondeur max
        if ($depth > $this->maxDepth) {
            return;
        }

        try {
            $raw = $this->icd11->getEntityRaw($uri);

            $code = $raw['code'] ?? $raw['codeRange'] ?? null;
            $title = $raw['title']['@value'] ?? $raw['title'] ?? 'Sans titre';
            $definition = $raw['definition']['@value'] ?? null;
            $classKind = $raw['classKind'] ?? null;
            $codeRange = $raw['codeRange'] ?? null;
            $browserUrl = $raw['browserUrl'] ?? null;
            $childUris = $raw['child'] ?? [];
            $isLeaf = empty($childUris);

            // Déterminer si c'est un code résiduel (Y/Z codes, "autres" etc.)
            $isResidual = isset($raw['postcoordinationScale'])
                || str_contains($title, 'autres')
                || str_contains($title, 'sans précision');

            $canonicalUri = str_replace('http://', 'https://', $raw['@id'] ?? $uri);

            $chapter = Icd11Chapter::updateOrCreate(
                ['uri' => $canonicalUri],
                [
                    'code' => $code,
                    'code_range' => $codeRange,
                    'title' => $title,
                    'definition' => $definition,
                    'class_kind' => $classKind,
                    'browser_url' => $browserUrl,
                    'parent_id' => $parentId,
                    'depth' => $depth,
                    'sort_order' => $sortOrder,
                    'is_leaf' => $isLeaf && $depth >= $this->maxDepth,
                    'is_residual' => $isResidual,
                ]
            );

            $this->imported++;

            // Importer les enfants récursivement
            if ($depth < $this->maxDepth && !empty($childUris)) {
                foreach ($childUris as $childIndex => $childUri) {
                    $this->importEntity($childUri, $chapter->id, $depth + 1, $childIndex);

                    // Pause pour respecter le rate limit API OMS
                    usleep(100_000); // 100ms entre chaque requête
                }
            }
        } catch (\Exception $e) {
            $this->errors++;
            \Illuminate\Support\Facades\Log::warning('ICD-11 import error', [
                'uri' => $uri,
                'depth' => $depth,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
