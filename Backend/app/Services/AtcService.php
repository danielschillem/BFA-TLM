<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Service Classification ATC (Anatomical Therapeutic Chemical — OMS).
 *
 * @see https://www.whocc.no/atc_ddd_index/
 *
 * Référentiel embarqué au niveau 1-3 pour usage hors-ligne,
 * couvrant les classes fréquentes en Afrique de l'Ouest / Burkina Faso.
 */
class AtcService
{
    /**
     * Classification ATC — niveaux 1 à 3 (embarqué).
     * Niveau 1 : 1 lettre (groupe anatomique principal)
     * Niveau 2 : 3 caractères (sous-groupe thérapeutique)
     * Niveau 3 : 4 caractères (sous-groupe pharmacologique)
     */
    private const ATC_TREE = [
        // ── A — Appareil digestif et métabolisme ──────────────────────
        'A' => [
            'code' => 'A',
            'display' => 'Appareil digestif et métabolisme',
            'display_en' => 'Alimentary tract and metabolism',
            'children' => [
                'A01' => ['display' => 'Préparations stomatologiques', 'children' => [
                    'A01A' => 'Préparations stomatologiques',
                ]],
                'A02' => ['display' => 'Médicaments pour les troubles liés à l\'acidité', 'children' => [
                    'A02A' => 'Antiacides',
                    'A02B' => 'Antiulcéreux',
                ]],
                'A03' => ['display' => 'Antispasmodiques et anticholinergiques', 'children' => [
                    'A03A' => 'Antispasmodiques synthétiques, anticholinergiques',
                    'A03B' => 'Belladone et dérivés',
                    'A03F' => 'Propulsifs',
                ]],
                'A04' => ['display' => 'Antiémétiques et antinauséeux', 'children' => [
                    'A04A' => 'Antiémétiques et antinauséeux',
                ]],
                'A05' => ['display' => 'Thérapeutique biliaire et hépatique', 'children' => [
                    'A05A' => 'Cholagogues et cholérétiques',
                ]],
                'A06' => ['display' => 'Laxatifs', 'children' => [
                    'A06A' => 'Laxatifs',
                ]],
                'A07' => ['display' => 'Antidiarrhéiques et anti-inflammatoires intestinaux', 'children' => [
                    'A07A' => 'Anti-infectieux intestinaux',
                    'A07B' => 'Adsorbants intestinaux',
                    'A07D' => 'Antipropulsifs',
                    'A07E' => 'Anti-inflammatoires intestinaux',
                ]],
                'A10' => ['display' => 'Médicaments du diabète', 'children' => [
                    'A10A' => 'Insulines et analogues',
                    'A10B' => 'Antidiabétiques oraux',
                ]],
                'A11' => ['display' => 'Vitamines', 'children' => [
                    'A11A' => 'Multivitamines',
                    'A11C' => 'Vitamine A et D',
                    'A11D' => 'Vitamine B1',
                    'A11G' => 'Acide ascorbique (Vitamine C)',
                ]],
                'A12' => ['display' => 'Suppléments minéraux', 'children' => [
                    'A12A' => 'Calcium',
                    'A12B' => 'Potassium',
                    'A12C' => 'Autres suppléments minéraux',
                ]],
            ],
        ],

        // ── B — Sang et organes hématopoïétiques ─────────────────────
        'B' => [
            'code' => 'B',
            'display' => 'Sang et organes hématopoïétiques',
            'display_en' => 'Blood and blood forming organs',
            'children' => [
                'B01' => ['display' => 'Antithrombotiques', 'children' => [
                    'B01A' => 'Antithrombotiques',
                ]],
                'B02' => ['display' => 'Antihémorragiques', 'children' => [
                    'B02A' => 'Antifibrinolytiques',
                    'B02B' => 'Vitamine K et autres hémostatiques',
                ]],
                'B03' => ['display' => 'Préparations antianémiques', 'children' => [
                    'B03A' => 'Préparations à base de fer',
                    'B03B' => 'Vitamine B12 et acide folique',
                ]],
                'B05' => ['display' => 'Substituts du sang et solutions de perfusion', 'children' => [
                    'B05A' => 'Sang et produits dérivés',
                    'B05B' => 'Solutions intraveineuses',
                    'B05C' => 'Solutions d\'irrigation',
                    'B05X' => 'Additifs pour solutions IV',
                ]],
            ],
        ],

        // ── C — Système cardiovasculaire ──────────────────────────────
        'C' => [
            'code' => 'C',
            'display' => 'Système cardiovasculaire',
            'display_en' => 'Cardiovascular system',
            'children' => [
                'C01' => ['display' => 'Thérapeutique cardiaque', 'children' => [
                    'C01A' => 'Glycosides cardiotoniques',
                    'C01B' => 'Antiarythmiques',
                    'C01D' => 'Vasodilatateurs en cardiologie',
                ]],
                'C02' => ['display' => 'Antihypertenseurs', 'children' => [
                    'C02A' => 'Antiadrénergiques à action centrale',
                    'C02C' => 'Antiadrénergiques à action périphérique',
                ]],
                'C03' => ['display' => 'Diurétiques', 'children' => [
                    'C03A' => 'Diurétiques à faible taux',
                    'C03C' => 'Diurétiques de l\'anse',
                    'C03D' => 'Diurétiques épargneurs de potassium',
                ]],
                'C07' => ['display' => 'Bêta-bloquants', 'children' => [
                    'C07A' => 'Bêta-bloquants',
                ]],
                'C08' => ['display' => 'Inhibiteurs calciques', 'children' => [
                    'C08C' => 'Inhibiteurs calciques sélectifs à effet vasculaire',
                    'C08D' => 'Inhibiteurs calciques sélectifs à effet cardiaque',
                ]],
                'C09' => ['display' => 'Agents agissant sur le système rénine-angiotensine', 'children' => [
                    'C09A' => 'IEC',
                    'C09C' => 'ARA II (sartans)',
                ]],
                'C10' => ['display' => 'Hypolipémiants', 'children' => [
                    'C10A' => 'Hypolipémiants',
                ]],
            ],
        ],

        // ── D — Dermatologie ──────────────────────────────────────────
        'D' => [
            'code' => 'D',
            'display' => 'Dermatologie',
            'display_en' => 'Dermatologicals',
            'children' => [
                'D01' => ['display' => 'Antifongiques dermatologiques', 'children' => [
                    'D01A' => 'Antifongiques à usage topique',
                    'D01B' => 'Antifongiques à usage systémique',
                ]],
                'D06' => ['display' => 'Antibiotiques et chimiothérapeutiques dermatologiques', 'children' => [
                    'D06A' => 'Antibiotiques à usage topique',
                    'D06B' => 'Chimiothérapeutiques à usage topique',
                ]],
                'D07' => ['display' => 'Corticoïdes dermatologiques', 'children' => [
                    'D07A' => 'Corticoïdes non associés',
                ]],
            ],
        ],

        // ── G — Système génito-urinaire et hormones sexuelles ─────────
        'G' => [
            'code' => 'G',
            'display' => 'Système génito-urinaire et hormones sexuelles',
            'display_en' => 'Genito-urinary system and sex hormones',
            'children' => [
                'G01' => ['display' => 'Anti-infectieux et antiseptiques gynécologiques', 'children' => [
                    'G01A' => 'Anti-infectieux et antiseptiques',
                ]],
                'G02' => ['display' => 'Autres gynécologiques', 'children' => [
                    'G02A' => 'Ocytociques',
                    'G02B' => 'Contraceptifs',
                    'G02C' => 'Autres gynécologiques',
                ]],
                'G03' => ['display' => 'Hormones sexuelles', 'children' => [
                    'G03A' => 'Contraceptifs hormonaux systémiques',
                    'G03C' => 'Estrogènes',
                ]],
            ],
        ],

        // ── H — Hormones systémiques (hors sexuelles) ─────────────────
        'H' => [
            'code' => 'H',
            'display' => 'Hormones systémiques (hors sexuelles et insuline)',
            'display_en' => 'Systemic hormonal preparations, excl. sex hormones and insulins',
            'children' => [
                'H02' => ['display' => 'Corticoïdes à usage systémique', 'children' => [
                    'H02A' => 'Corticoïdes à usage systémique non associés',
                ]],
                'H03' => ['display' => 'Thyroïdiens', 'children' => [
                    'H03A' => 'Hormones thyroïdiennes',
                    'H03B' => 'Antithyroïdiens',
                ]],
            ],
        ],

        // ── J — Anti-infectieux à usage systémique ────────────────────
        'J' => [
            'code' => 'J',
            'display' => 'Anti-infectieux à usage systémique',
            'display_en' => 'Antiinfectives for systemic use',
            'children' => [
                'J01' => ['display' => 'Antibactériens à usage systémique', 'children' => [
                    'J01A' => 'Tétracyclines',
                    'J01C' => 'Bêta-lactamines, pénicillines',
                    'J01D' => 'Autres bêta-lactamines (céphalosporines)',
                    'J01E' => 'Sulfamides et triméthoprime',
                    'J01F' => 'Macrolides et lincosamides',
                    'J01G' => 'Aminosides',
                    'J01M' => 'Quinolones',
                    'J01X' => 'Autres antibactériens',
                ]],
                'J02' => ['display' => 'Antimycosiques à usage systémique', 'children' => [
                    'J02A' => 'Antimycosiques à usage systémique',
                ]],
                'J04' => ['display' => 'Antimycobactériens', 'children' => [
                    'J04A' => 'Antituberculeux',
                    'J04B' => 'Antilépreux',
                ]],
                'J05' => ['display' => 'Antiviraux à usage systémique', 'children' => [
                    'J05A' => 'Antiviraux à action directe',
                ]],
                'J06' => ['display' => 'Immunsérums et immunoglobulines', 'children' => [
                    'J06A' => 'Immunsérums',
                    'J06B' => 'Immunoglobulines',
                ]],
                'J07' => ['display' => 'Vaccins', 'children' => [
                    'J07A' => 'Vaccins bactériens',
                    'J07B' => 'Vaccins viraux',
                ]],
            ],
        ],

        // ── L — Antinéoplasiques et immunomodulateurs ─────────────────
        'L' => [
            'code' => 'L',
            'display' => 'Antinéoplasiques et immunomodulateurs',
            'display_en' => 'Antineoplastic and immunomodulating agents',
            'children' => [
                'L01' => ['display' => 'Antinéoplasiques', 'children' => [
                    'L01A' => 'Agents alkylants',
                    'L01B' => 'Antimétabolites',
                    'L01X' => 'Autres antinéoplasiques',
                ]],
                'L04' => ['display' => 'Immunosuppresseurs', 'children' => [
                    'L04A' => 'Immunosuppresseurs',
                ]],
            ],
        ],

        // ── M — Système musculo-squelettique ──────────────────────────
        'M' => [
            'code' => 'M',
            'display' => 'Système musculo-squelettique',
            'display_en' => 'Musculo-skeletal system',
            'children' => [
                'M01' => ['display' => 'Anti-inflammatoires et antirhumatismaux', 'children' => [
                    'M01A' => 'AINS',
                    'M01B' => 'AINS en association',
                ]],
                'M02' => ['display' => 'Topiques pour douleurs articulaires et musculaires', 'children' => [
                    'M02A' => 'Topiques pour douleurs articulaires et musculaires',
                ]],
                'M03' => ['display' => 'Myorelaxants', 'children' => [
                    'M03A' => 'Myorelaxants à action périphérique',
                    'M03B' => 'Myorelaxants à action centrale',
                ]],
            ],
        ],

        // ── N — Système nerveux ───────────────────────────────────────
        'N' => [
            'code' => 'N',
            'display' => 'Système nerveux',
            'display_en' => 'Nervous system',
            'children' => [
                'N01' => ['display' => 'Anesthésiques', 'children' => [
                    'N01A' => 'Anesthésiques généraux',
                    'N01B' => 'Anesthésiques locaux',
                ]],
                'N02' => ['display' => 'Analgésiques', 'children' => [
                    'N02A' => 'Opioïdes',
                    'N02B' => 'Autres analgésiques et antipyrétiques',
                    'N02C' => 'Antimigraineux',
                ]],
                'N03' => ['display' => 'Antiépileptiques', 'children' => [
                    'N03A' => 'Antiépileptiques',
                ]],
                'N04' => ['display' => 'Antiparkinsoniens', 'children' => [
                    'N04A' => 'Anticholinergiques',
                    'N04B' => 'Dopaminergiques',
                ]],
                'N05' => ['display' => 'Psycholeptiques', 'children' => [
                    'N05A' => 'Antipsychotiques',
                    'N05B' => 'Anxiolytiques',
                    'N05C' => 'Hypnotiques et sédatifs',
                ]],
                'N06' => ['display' => 'Psychoanaleptiques', 'children' => [
                    'N06A' => 'Antidépresseurs',
                    'N06B' => 'Psychostimulants',
                ]],
            ],
        ],

        // ── P — Antiparasitaires ──────────────────────────────────────
        'P' => [
            'code' => 'P',
            'display' => 'Antiparasitaires, insecticides et répulsifs',
            'display_en' => 'Antiparasitic products, insecticides and repellents',
            'children' => [
                'P01' => ['display' => 'Antiprotozoaires', 'children' => [
                    'P01A' => 'Agents contre l\'amibiase et autres protozooses',
                    'P01B' => 'Antipaludéens',
                    'P01C' => 'Agents contre la leishmaniose et la trypanosomiase',
                ]],
                'P02' => ['display' => 'Anthelminthiques', 'children' => [
                    'P02B' => 'Antitrématodes',
                    'P02C' => 'Antinématodes',
                    'P02D' => 'Anticestodes',
                ]],
                'P03' => ['display' => 'Ectoparasiticides', 'children' => [
                    'P03A' => 'Ectoparasiticides (dont scabicides)',
                ]],
            ],
        ],

        // ── R — Système respiratoire ──────────────────────────────────
        'R' => [
            'code' => 'R',
            'display' => 'Système respiratoire',
            'display_en' => 'Respiratory system',
            'children' => [
                'R01' => ['display' => 'Préparations nasales', 'children' => [
                    'R01A' => 'Décongestionnants et préparations nasales',
                ]],
                'R02' => ['display' => 'Préparations pour la gorge', 'children' => [
                    'R02A' => 'Préparations pour la gorge',
                ]],
                'R03' => ['display' => 'Anti-asthmatiques', 'children' => [
                    'R03A' => 'Adrénergiques pour inhalation',
                    'R03B' => 'Autres anti-asthmatiques inhalés',
                    'R03C' => 'Adrénergiques à usage systémique',
                    'R03D' => 'Autres anti-asthmatiques systémiques',
                ]],
                'R05' => ['display' => 'Antitussifs et médicaments du rhume', 'children' => [
                    'R05C' => 'Expectorants',
                    'R05D' => 'Antitussifs',
                ]],
                'R06' => ['display' => 'Antihistaminiques à usage systémique', 'children' => [
                    'R06A' => 'Antihistaminiques à usage systémique',
                ]],
            ],
        ],

        // ── S — Organes sensoriels ────────────────────────────────────
        'S' => [
            'code' => 'S',
            'display' => 'Organes sensoriels',
            'display_en' => 'Sensory organs',
            'children' => [
                'S01' => ['display' => 'Ophtalmologiques', 'children' => [
                    'S01A' => 'Anti-infectieux ophtalmiques',
                    'S01B' => 'Anti-inflammatoires ophtalmiques',
                    'S01E' => 'Antiglaucomateux',
                ]],
                'S02' => ['display' => 'Otologiques', 'children' => [
                    'S02A' => 'Anti-infectieux otologiques',
                ]],
            ],
        ],

        // ── V — Divers ───────────────────────────────────────────────
        'V' => [
            'code' => 'V',
            'display' => 'Divers',
            'display_en' => 'Various',
            'children' => [
                'V03' => ['display' => 'Tous les autres produits thérapeutiques', 'children' => [
                    'V03A' => 'Tous les autres produits thérapeutiques',
                ]],
                'V06' => ['display' => 'Nutriments généraux', 'children' => [
                    'V06B' => 'Combinaisons de protéines',
                    'V06D' => 'Autres nutriments',
                ]],
            ],
        ],
    ];

    /**
     * Obtenir l'arbre ATC complet (niveau 1).
     */
    public function tree(): array
    {
        return collect(self::ATC_TREE)->map(fn($group, $code) => [
            'code' => $code,
            'display' => $group['display'],
            'display_en' => $group['display_en'] ?? null,
            'childCount' => count($group['children'] ?? []),
        ])->values()->toArray();
    }

    /**
     * Obtenir les sous-groupes d'un code ATC (niveau 2 ou 3).
     */
    public function children(string $code): array
    {
        $code = strtoupper(trim($code));

        // Niveau 1 → retourne niveau 2
        if (strlen($code) === 1 && isset(self::ATC_TREE[$code])) {
            return collect(self::ATC_TREE[$code]['children'])
                ->map(fn($group, $childCode) => [
                    'code' => $childCode,
                    'display' => is_array($group) ? $group['display'] : $group,
                    'hasChildren' => is_array($group) && !empty($group['children']),
                ])
                ->values()
                ->toArray();
        }

        // Niveau 2 → retourne niveau 3
        if (strlen($code) === 3) {
            $parent = substr($code, 0, 1);
            if (isset(self::ATC_TREE[$parent]['children'][$code]) &&
                is_array(self::ATC_TREE[$parent]['children'][$code]) &&
                !empty(self::ATC_TREE[$parent]['children'][$code]['children'])) {

                return collect(self::ATC_TREE[$parent]['children'][$code]['children'])
                    ->map(fn($display, $childCode) => [
                        'code' => $childCode,
                        'display' => $display,
                        'hasChildren' => false,
                    ])
                    ->values()
                    ->toArray();
            }
        }

        return [];
    }

    /**
     * Recherche ATC par terme (cherche dans codes et libellés).
     */
    public function search(string $term, int $limit = 30): array
    {
        $term = mb_strtolower(trim($term));
        if (mb_strlen($term) < 2) {
            return ['items' => [], 'total' => 0];
        }

        $results = [];

        foreach (self::ATC_TREE as $l1Code => $l1) {
            // Chercher dans le niveau 1
            if ($this->matches($l1Code, $l1['display'], $term)) {
                $results[] = [
                    'code' => $l1Code,
                    'display' => $l1['display'],
                    'level' => 1,
                    'path' => $l1Code,
                ];
            }

            // Chercher dans niveaux 2 et 3
            foreach ($l1['children'] ?? [] as $l2Code => $l2) {
                $l2Display = is_array($l2) ? $l2['display'] : $l2;

                if ($this->matches($l2Code, $l2Display, $term)) {
                    $results[] = [
                        'code' => $l2Code,
                        'display' => $l2Display,
                        'level' => 2,
                        'path' => $l1Code . ' > ' . $l2Code,
                    ];
                }

                if (is_array($l2) && isset($l2['children'])) {
                    foreach ($l2['children'] as $l3Code => $l3Display) {
                        if ($this->matches($l3Code, $l3Display, $term)) {
                            $results[] = [
                                'code' => $l3Code,
                                'display' => $l3Display,
                                'level' => 3,
                                'path' => $l1Code . ' > ' . $l2Code . ' > ' . $l3Code,
                            ];
                        }
                    }
                }
            }
        }

        return [
            'items' => array_slice($results, 0, $limit),
            'total' => count($results),
        ];
    }

    /**
     * Lookup d'un code ATC.
     */
    public function lookup(string $code): ?array
    {
        $code = strtoupper(trim($code));
        $len = strlen($code);

        if ($len === 1) {
            if (!isset(self::ATC_TREE[$code])) return null;
            return [
                'code' => $code,
                'display' => self::ATC_TREE[$code]['display'],
                'display_en' => self::ATC_TREE[$code]['display_en'] ?? null,
                'level' => 1,
                'system' => 'http://www.whocc.no/atc',
                'oid' => '2.16.840.1.113883.6.73',
            ];
        }

        if ($len === 3) {
            $parent = substr($code, 0, 1);
            if (!isset(self::ATC_TREE[$parent]['children'][$code])) return null;
            $entry = self::ATC_TREE[$parent]['children'][$code];
            return [
                'code' => $code,
                'display' => is_array($entry) ? $entry['display'] : $entry,
                'level' => 2,
                'parent' => $parent,
                'parentDisplay' => self::ATC_TREE[$parent]['display'],
                'system' => 'http://www.whocc.no/atc',
                'oid' => '2.16.840.1.113883.6.73',
            ];
        }

        if ($len === 4) {
            $l1 = substr($code, 0, 1);
            $l2 = substr($code, 0, 3);
            if (!isset(self::ATC_TREE[$l1]['children'][$l2]) ||
                !is_array(self::ATC_TREE[$l1]['children'][$l2]) ||
                !isset(self::ATC_TREE[$l1]['children'][$l2]['children'][$code])) {
                return null;
            }
            return [
                'code' => $code,
                'display' => self::ATC_TREE[$l1]['children'][$l2]['children'][$code],
                'level' => 3,
                'parent' => $l2,
                'parentDisplay' => self::ATC_TREE[$l1]['children'][$l2]['display'],
                'system' => 'http://www.whocc.no/atc',
                'oid' => '2.16.840.1.113883.6.73',
            ];
        }

        // Code niveau 5+ (7 caractères) — on retourne la hiérarchie connue
        if ($len >= 5) {
            $l1 = substr($code, 0, 1);
            $l2 = substr($code, 0, 3);
            $l3 = substr($code, 0, 4);

            $parentInfo = $this->lookup($l3) ?? $this->lookup($l2) ?? $this->lookup($l1);

            return $parentInfo ? array_merge($parentInfo, [
                'code' => $code,
                'level' => $len === 5 ? 4 : 5,
                'note' => 'Résolution partielle — code de niveau supérieur au référentiel embarqué.',
            ]) : null;
        }

        return null;
    }

    /**
     * Valider un code ATC.
     */
    public function validate(string $code): array
    {
        $result = $this->lookup($code);

        if (!$result) {
            return [
                'valid' => false,
                'code' => $code,
                'message' => 'Code ATC non trouvé dans le référentiel.',
            ];
        }

        return [
            'valid' => true,
            'code' => $result['code'],
            'display' => $result['display'],
            'level' => $result['level'],
            'system' => 'http://www.whocc.no/atc',
            'message' => isset($result['note'])
                ? 'Code reconnu partiellement (niveau détaillé).'
                : 'Code ATC valide.',
        ];
    }

    /**
     * Recherche textuelle : le terme correspond-il au code ou au libellé ?
     */
    private function matches(string $code, string $display, string $term): bool
    {
        return str_contains(mb_strtolower($code), $term)
            || str_contains(mb_strtolower($display), $term);
    }
}
