<?php

namespace App\Console\Commands;

use App\Services\Dhis2Service;
use App\Services\EndosService;
use Illuminate\Console\Command;

class Dhis2PushData extends Command
{
    protected $signature = 'dhis2:push-data
                            {--period= : Période YYYYMM (défaut: mois en cours)}
                            {--org-unit= : UID de l\'org unit DHIS2}
                            {--target=dhis2 : Cible: dhis2, endos, ou both}
                            {--dry-run : Afficher sans envoyer}';

    protected $description = 'Pousser les indicateurs TLM agrégés vers DHIS2 et/ou ENDOS';

    public function handle(Dhis2Service $dhis2): int
    {
        $period  = $this->option('period') ?: now()->format('Ym');
        $target  = $this->option('target');
        $dryRun  = $this->option('dry-run');

        $this->info("Collecte des indicateurs TLM pour la période {$period}...");

        $indicators = $dhis2->collectTlmIndicators($period);

        $this->table(
            ['Indicateur', 'Valeur'],
            collect($indicators)->map(fn($v, $k) => [$k, $v])->values()->toArray()
        );

        if ($dryRun) {
            $this->warn('Mode dry-run — aucun envoi effectué.');
            return self::SUCCESS;
        }

        // ── Push vers DHIS2 ──
        if (in_array($target, ['dhis2', 'both'])) {
            $orgUnit = $this->option('org-unit');
            if (!$orgUnit) {
                $this->error('--org-unit requis pour DHIS2 direct.');
                return self::FAILURE;
            }

            $this->info("Envoi vers DHIS2 (org unit: {$orgUnit})...");

            try {
                $result = $dhis2->pushTlmIndicators($orgUnit, $period);
                $dhis2->recordSync($result, 'dhis2');
                $this->displayResult($result, 'DHIS2');
            } catch (\Exception $e) {
                $this->error("DHIS2: {$e->getMessage()}");
                if ($target === 'dhis2') {
                    return self::FAILURE;
                }
            }
        }

        // ── Push vers ENDOS ──
        if (in_array($target, ['endos', 'both'])) {
            $endos = new EndosService();

            if (!$endos->isEnabled()) {
                $this->warn('ENDOS non activé (ENDOS_ENABLED=false).');
                return $target === 'endos' ? self::FAILURE : self::SUCCESS;
            }

            $this->info('Envoi vers ENDOS...');

            try {
                $result = $endos->pushIndicators($period);
                $this->displayResult($result, 'ENDOS');
            } catch (\Exception $e) {
                $this->error("ENDOS: {$e->getMessage()}");
                return self::FAILURE;
            }
        }

        $this->newLine();
        $this->info('Terminé.');

        return self::SUCCESS;
    }

    protected function displayResult(array $result, string $target): void
    {
        if (isset($result['status']) && $result['status'] === 'skipped') {
            $this->warn("{$target}: {$result['message']}");
            return;
        }

        if (isset($result['importCount'])) {
            $this->info("{$target}: imported={$result['importCount']['imported']}, updated={$result['importCount']['updated']}, ignored={$result['importCount']['ignored']}");
        } else {
            $this->info("{$target}: " . json_encode($result));
        }
    }
}
