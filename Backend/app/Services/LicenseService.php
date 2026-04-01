<?php

namespace App\Services;

use App\Models\License;
use App\Models\LicenseModule;
use App\Models\Structure;
use Illuminate\Support\Str;

class LicenseService
{
    /**
     * Grille tarifaire de base annuelle par type de centre (FCFA).
     */
    public const GRILLE_BASE = [
        'cabinet'         => 500_000,
        'csps'            => 750_000,
        'cm'              => 1_500_000,
        'cma'             => 3_000_000,
        'chr'             => 5_000_000,
        'chu'             => 8_000_000,
        'clinique_privee' => 2_000_000,
        'hopital_prive'   => 4_000_000,
        'pharmacie'       => 400_000,
        'laboratoire'     => 600_000,
    ];

    /**
     * Supplément par lit / mois selon le type de centre (FCFA).
     */
    public const PRIX_LIT_MOIS = [
        'cabinet'         => 0,
        'csps'            => 5_000,
        'cm'              => 4_000,
        'cma'             => 3_500,
        'chr'             => 3_000,
        'chu'             => 2_500,
        'clinique_privee' => 4_500,
        'hopital_prive'   => 3_500,
        'pharmacie'       => 0,
        'laboratoire'     => 0,
    ];

    /**
     * Supplément par tranche d'utilisateurs supplémentaires (FCFA/an).
     * Les 10 premiers sont inclus dans le prix de base.
     */
    public const PALIERS_UTILISATEURS = [
        ['min' => 11,  'max' => 25,  'prix_par_user' => 50_000],
        ['min' => 26,  'max' => 50,  'prix_par_user' => 40_000],
        ['min' => 51,  'max' => 100, 'prix_par_user' => 30_000],
        ['min' => 101, 'max' => 999, 'prix_par_user' => 20_000],
    ];

    /**
     * Coefficient multiplicateur par nombre de sites.
     */
    public const COEF_SITES = [
        1 => 1.00,
        2 => 1.80,
        3 => 2.50,
        4 => 3.10,
        5 => 3.60,
    ];

    /**
     * Durée de la période d'évaluation (jours).
     */
    public const DUREE_DEMO_JOURS = 14;

    // ── Calculs ─────────────────────────────────────────────────────────────

    /**
     * Calcule le montant annuel pour une licence selon les critères.
     */
    public function calculerMontant(
        string $typeCentre,
        int    $capaciteLits = 0,
        int    $maxUtilisateurs = 10,
        int    $nombreSites = 1,
        array  $moduleCodes = []
    ): array {
        $typeCentre = Str::lower($typeCentre);

        // 1) Base annuelle
        $montantBase = self::GRILLE_BASE[$typeCentre] ?? self::GRILLE_BASE['cabinet'];

        // 2) Supplément lits (annualisé)
        $prixLitMois = self::PRIX_LIT_MOIS[$typeCentre] ?? 0;
        $supplementLits = $capaciteLits * $prixLitMois * 12;

        // 3) Supplément utilisateurs
        $supplementUsers = 0;
        $usersRestants = max(0, $maxUtilisateurs - 10);
        foreach (self::PALIERS_UTILISATEURS as $palier) {
            if ($usersRestants <= 0) break;
            $trancheMax = $palier['max'] - $palier['min'] + 1;
            $nbDansTranche = min($usersRestants, $trancheMax);
            $supplementUsers += $nbDansTranche * $palier['prix_par_user'];
            $usersRestants -= $nbDansTranche;
        }

        // 4) Coefficient multi-site
        $coefSite = self::COEF_SITES[$nombreSites] ?? ($nombreSites * 0.7);

        // 5) Modules optionnels
        $montantModules = 0;
        if (!empty($moduleCodes)) {
            $montantModules = LicenseModule::where('actif', true)
                ->whereIn('code', $moduleCodes)
                ->where('inclus_base', false)
                ->sum('prix_unitaire_fcfa');
        }

        // 6) Total
        $sousTotal = ($montantBase + $supplementLits + $supplementUsers) * $coefSite;
        $montantTotal = (int) round($sousTotal + $montantModules);

        return [
            'type_centre'       => $typeCentre,
            'capacite_lits'     => $capaciteLits,
            'max_utilisateurs'  => $maxUtilisateurs,
            'nombre_sites'      => $nombreSites,
            'modules'           => $moduleCodes,
            'detail' => [
                'montant_base'       => $montantBase,
                'supplement_lits'    => $supplementLits,
                'supplement_users'   => $supplementUsers,
                'coefficient_sites'  => $coefSite,
                'sous_total'         => (int) round($sousTotal),
                'montant_modules'    => $montantModules,
            ],
            'montant_total_fcfa' => $montantTotal,
            'montant_total_eur'  => round($montantTotal / 655.957, 2),
        ];
    }

    // ── Création ────────────────────────────────────────────────────────────

    /**
     * Crée une licence démo (14 jours, tous modules, gratuite).
     */
    public function creerDemo(Structure $structure, ?int $createdById = null): License
    {
        $allModules = LicenseModule::where('actif', true)->pluck('id');

        $license = License::create([
            'license_key'        => $this->generateKey(),
            'structure_id'       => $structure->id,
            'type'               => 'demo',
            'statut'             => 'active',
            'type_centre'        => $structure->typeStructure?->libelle ?? 'csps',
            'capacite_lits'      => 0,
            'max_utilisateurs'   => 999,   // Illimité en démo
            'nombre_sites'       => 1,
            'montant_base_fcfa'  => 0,
            'montant_modules_fcfa' => 0,
            'montant_total_fcfa' => 0,
            'date_debut'         => now()->toDateString(),
            'date_fin'           => now()->addDays(self::DUREE_DEMO_JOURS)->toDateString(),
            'notes'              => 'Licence d\'évaluation gratuite — ' . self::DUREE_DEMO_JOURS . ' jours',
            'created_by_id'      => $createdById,
        ]);

        $license->modules()->sync($allModules);

        return $license->load('modules');
    }

    /**
     * Crée une licence annuelle payante.
     */
    public function creerLicenceAnnuelle(
        Structure $structure,
        string    $typeCentre,
        int       $capaciteLits,
        int       $maxUtilisateurs,
        int       $nombreSites,
        array     $moduleCodes,
        ?int      $createdById = null,
        ?string   $zoneSanitaire = null,
        ?string   $notes = null
    ): License {
        $calcul = $this->calculerMontant($typeCentre, $capaciteLits, $maxUtilisateurs, $nombreSites, $moduleCodes);

        // Modules à attacher (base + sélectionnés)
        $moduleIds = LicenseModule::where('actif', true)
            ->where(function ($q) use ($moduleCodes) {
                $q->where('inclus_base', true)
                  ->orWhereIn('code', $moduleCodes);
            })
            ->pluck('id');

        $license = License::create([
            'license_key'          => $this->generateKey(),
            'structure_id'         => $structure->id,
            'type'                 => 'annuelle',
            'statut'               => 'active',
            'type_centre'          => $typeCentre,
            'capacite_lits'        => $capaciteLits,
            'max_utilisateurs'     => $maxUtilisateurs,
            'nombre_sites'         => $nombreSites,
            'zone_sanitaire'       => $zoneSanitaire,
            'montant_base_fcfa'    => $calcul['detail']['sous_total'],
            'montant_modules_fcfa' => $calcul['detail']['montant_modules'],
            'montant_total_fcfa'   => $calcul['montant_total_fcfa'],
            'date_debut'           => now()->toDateString(),
            'date_fin'             => now()->addYear()->toDateString(),
            'date_renouvellement'  => now()->addYear()->subMonth()->toDateString(),
            'notes'                => $notes,
            'created_by_id'        => $createdById,
        ]);

        $license->modules()->sync($moduleIds);

        return $license->load('modules');
    }

    /**
     * Renouvelle une licence annuelle pour 12 mois supplémentaires.
     */
    public function renouveler(License $license): License
    {
        $newStart = $license->date_fin->addDay();
        $license->update([
            'date_debut'          => $newStart->toDateString(),
            'date_fin'            => $newStart->addYear()->toDateString(),
            'date_renouvellement' => $newStart->addYear()->subMonth()->toDateString(),
            'statut'              => 'active',
        ]);

        return $license->fresh('modules');
    }

    /**
     * Vérifie la licence active d'une structure.
     */
    public function verifierLicence(int $structureId): array
    {
        $license = License::with('modules')
            ->forStructure($structureId)
            ->active()
            ->latest('date_fin')
            ->first();

        if (!$license) {
            return [
                'valide'   => false,
                'message'  => 'Aucune licence active pour cette structure.',
                'license'  => null,
            ];
        }

        return [
            'valide'          => true,
            'type'            => $license->type,
            'jours_restants'  => $license->joursRestants(),
            'demo'            => $license->isDemo(),
            'modules_actifs'  => $license->modules->pluck('code'),
            'max_utilisateurs'=> $license->max_utilisateurs,
            'license'         => $license,
        ];
    }

    /**
     * Retourne la grille tarifaire complète (pour affichage).
     */
    public function getGrilleTarifaire(): array
    {
        return [
            'base_annuelle_fcfa'      => self::GRILLE_BASE,
            'prix_lit_mois_fcfa'      => self::PRIX_LIT_MOIS,
            'paliers_utilisateurs'    => self::PALIERS_UTILISATEURS,
            'coefficient_sites'       => self::COEF_SITES,
            'duree_demo_jours'        => self::DUREE_DEMO_JOURS,
            'modules'                 => LicenseModule::where('actif', true)
                                            ->select('code', 'libelle', 'prix_unitaire_fcfa', 'inclus_base')
                                            ->get(),
            'monnaie'                 => 'FCFA (XOF)',
            'taux_eur'               => '1 EUR = 655,957 FCFA',
        ];
    }

    // ── Privé ───────────────────────────────────────────────────────────────

    private function generateKey(): string
    {
        return hash('sha256', Str::uuid()->toString() . now()->timestamp . random_bytes(16));
    }
}
