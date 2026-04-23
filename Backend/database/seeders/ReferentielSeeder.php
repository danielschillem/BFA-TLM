<?php

namespace Database\Seeders;

use App\Models\Acte;
use App\Models\Grade;
use App\Models\Localite;
use App\Models\Pays;
use App\Models\Specialite;
use App\Models\TypeActe;
use App\Models\TypeDiagnostic;
use App\Models\TypeExamen;
use App\Models\TypeFacturation;
use App\Models\TypeProfessionnelSante;
use App\Models\TypeSalle;
use App\Models\TypeStructure;
use Illuminate\Database\Seeder;

/**
 * Seeder des données de référence — idempotent, safe pour la production.
 *
 * Usage : php artisan db:seed --class=ReferentielSeeder
 */
class ReferentielSeeder extends Seeder
{
    public function run(): void
    {
        // ══════════════════════════════════════════════════════════════
        //  PAYS (Burkina Faso uniquement)
        // ══════════════════════════════════════════════════════════════
        $bf = Pays::firstOrCreate(['code' => 'BF'], ['nom' => 'Burkina Faso', 'indicatif' => '+226']);

        // ══════════════════════════════════════════════════════════════
        //  LOCALITÉS — 17 régions du Burkina Faso (réforme juillet 2025)
        //  Chefs-lieux des régions avec noms officiels actualisés
        // ══════════════════════════════════════════════════════════════

        // 01 – Guiriko (ex-Hauts-Bassins)
        Localite::updateOrCreate(
            ['commune' => 'Bobo-Dioulasso', 'pays_id' => $bf->id],
            ['region' => 'Guiriko', 'province' => 'Houet']
        );
        // 02 – Bankui (ex-Boucle du Mouhoun)
        Localite::updateOrCreate(
            ['commune' => 'Dédougou', 'pays_id' => $bf->id],
            ['region' => 'Bankui', 'province' => 'Mouhoun']
        );
        // 03 – Liptako (ex-Sahel)
        Localite::updateOrCreate(
            ['commune' => 'Dori', 'pays_id' => $bf->id],
            ['region' => 'Liptako', 'province' => 'Séno']
        );
        // 04 – Goulmou (ex-Est)
        Localite::updateOrCreate(
            ['commune' => 'Fada N\'Gourma', 'pays_id' => $bf->id],
            ['region' => 'Goulmou', 'province' => 'Gourma']
        );
        // 05 – Djôrô (ex-Sud-Ouest)
        Localite::updateOrCreate(
            ['commune' => 'Gaoua', 'pays_id' => $bf->id],
            ['region' => 'Djôrô', 'province' => 'Poni']
        );
        // 06 – Kuilsé (ex-Centre-Nord)
        Localite::updateOrCreate(
            ['commune' => 'Kaya', 'pays_id' => $bf->id],
            ['region' => 'Kuilsé', 'province' => 'Sanmatenga']
        );
        // 07 – Nando (ex-Centre-Ouest)
        Localite::updateOrCreate(
            ['commune' => 'Koudougou', 'pays_id' => $bf->id],
            ['region' => 'Nando', 'province' => 'Boulkiemdé']
        );
        // 08 – Oubri (ex-Plateau-Central)
        Localite::updateOrCreate(
            ['commune' => 'Ziniaré', 'pays_id' => $bf->id],
            ['region' => 'Oubri', 'province' => 'Oubritenga']
        );
        // 09 – Yaadga (ex-Nord)
        Localite::updateOrCreate(
            ['commune' => 'Ouahigouya', 'pays_id' => $bf->id],
            ['region' => 'Yaadga', 'province' => 'Yatenga']
        );
        // 10 – Nakambé (ex-Centre-Est)
        Localite::updateOrCreate(
            ['commune' => 'Tenkodogo', 'pays_id' => $bf->id],
            ['region' => 'Nakambé', 'province' => 'Boulgou']
        );
        // 11 – Kadiogo (ex-Centre)
        Localite::updateOrCreate(
            ['commune' => 'Ouagadougou', 'pays_id' => $bf->id],
            ['region' => 'Kadiogo', 'province' => 'Kadiogo']
        );
        // 12 – Tannounyan (ex-Cascades)
        Localite::updateOrCreate(
            ['commune' => 'Banfora', 'pays_id' => $bf->id],
            ['region' => 'Tannounyan', 'province' => 'Comoé']
        );
        // 13 – Nazinon (ex-Centre-Sud)
        Localite::updateOrCreate(
            ['commune' => 'Manga', 'pays_id' => $bf->id],
            ['region' => 'Nazinon', 'province' => 'Zoundwéogo']
        );
        // 14 – Sirba (nouvelle région)
        Localite::updateOrCreate(
            ['commune' => 'Bogandé', 'pays_id' => $bf->id],
            ['region' => 'Sirba', 'province' => 'Gnagna']
        );
        // 15 – Soum (nouvelle région)
        Localite::updateOrCreate(
            ['commune' => 'Djibo', 'pays_id' => $bf->id],
            ['region' => 'Soum', 'province' => 'Soum']
        );
        // 16 – Tapoa (nouvelle région)
        Localite::updateOrCreate(
            ['commune' => 'Diapaga', 'pays_id' => $bf->id],
            ['region' => 'Tapoa', 'province' => 'Tapoa']
        );
        // 17 – Sourou (nouvelle région)
        Localite::updateOrCreate(
            ['commune' => 'Tougan', 'pays_id' => $bf->id],
            ['region' => 'Sourou', 'province' => 'Sourou']
        );

        // ══════════════════════════════════════════════════════════════
        //  GRADES (hiérarchie académique / hospitalière)
        // ══════════════════════════════════════════════════════════════
        // Supprimer les anciens grades obsolètes (qui correspondaient aux types PS)
        Grade::whereIn('code', ['MED', 'INF', 'SF', 'PHARM', 'IDE', 'AA', 'AB'])->delete();

        Grade::updateOrCreate(['code' => 'MG'],   ['libelle' => 'Médecin généraliste']);
        Grade::updateOrCreate(['code' => 'MS'],   ['libelle' => 'Médecin spécialiste']);
        Grade::updateOrCreate(['code' => 'MH'],   ['libelle' => 'Médecin hospitalier']);
        Grade::updateOrCreate(['code' => 'MA'],   ['libelle' => 'Maître-assistant (CAMES)']);
        Grade::updateOrCreate(['code' => 'MCA'],  ['libelle' => 'Maître de conférences agrégé (CAMES)']);
        Grade::updateOrCreate(['code' => 'PT'],   ['libelle' => 'Professeur titulaire (CAMES)']);

        // ══════════════════════════════════════════════════════════════
        //  TYPES DE PROFESSIONNEL DE SANTÉ
        // ══════════════════════════════════════════════════════════════
        // Supprimer l'ancien type "Spécialiste" (doublon de "Médecin")
        TypeProfessionnelSante::where('libelle', 'Spécialiste')->delete();

        TypeProfessionnelSante::firstOrCreate(['libelle' => 'Médecin'],     ['description' => 'Médecin généraliste ou spécialiste']);
        TypeProfessionnelSante::firstOrCreate(['libelle' => 'Infirmier'],   ['description' => 'Infirmier diplômé d\'État']);
        TypeProfessionnelSante::firstOrCreate(['libelle' => 'Sage-femme'],  ['description' => 'Sage-femme / maïeuticien']);
        TypeProfessionnelSante::firstOrCreate(['libelle' => 'Pharmacien'],  ['description' => 'Pharmacien']);

        // ══════════════════════════════════════════════════════════════
        //  TYPES DE STRUCTURE
        // ══════════════════════════════════════════════════════════════
        TypeStructure::firstOrCreate(['libelle' => 'CHU'],  ['description' => 'Centre Hospitalier Universitaire', 'actif' => true]);
        TypeStructure::firstOrCreate(['libelle' => 'CHR'],  ['description' => 'Centre Hospitalier Régional', 'actif' => true]);
        TypeStructure::firstOrCreate(['libelle' => 'CMA'],  ['description' => 'Centre Médical avec Antenne chirurgicale', 'actif' => true]);
        TypeStructure::firstOrCreate(['libelle' => 'CSPS'], ['description' => 'Centre de Santé et de Promotion Sociale', 'actif' => true]);
        TypeStructure::firstOrCreate(['libelle' => 'CM'],   ['description' => 'Centre Médical', 'actif' => true]);

        // ══════════════════════════════════════════════════════════════
        //  TYPES D'ACTES & ACTES
        // ══════════════════════════════════════════════════════════════
        $typeConsult    = TypeActe::firstOrCreate(['libelle' => 'Consultation'], ['description' => 'Actes de consultation']);
        $typeExamenActe = TypeActe::firstOrCreate(['libelle' => 'Examen'],       ['description' => 'Actes d\'examen complémentaire']);
        TypeActe::firstOrCreate(['libelle' => 'Chirurgie'],    ['description' => 'Actes chirurgicaux']);

        Acte::firstOrCreate(['libelle' => 'Consultation générale'],   ['cout' => 5000,  'duree' => 30, 'description' => 'Consultation de médecine générale',                'type_acte_id' => $typeConsult->id]);
        Acte::firstOrCreate(['libelle' => 'Consultation spécialisée'],['cout' => 15000, 'duree' => 45, 'description' => 'Consultation chez un spécialiste',                 'type_acte_id' => $typeConsult->id]);
        Acte::firstOrCreate(['libelle' => 'Électrocardiogramme (ECG)'],['cout' => 10000,'duree' => 20, 'description' => 'Enregistrement de l\'activité électrique du cœur', 'type_acte_id' => $typeExamenActe->id]);
        Acte::firstOrCreate(['libelle' => 'Échographie abdominale'],  ['cout' => 20000, 'duree' => 30, 'description' => 'Échographie de l\'abdomen',                        'type_acte_id' => $typeExamenActe->id]);
        Acte::firstOrCreate(['libelle' => 'Bilan sanguin complet'],   ['cout' => 12000, 'duree' => 15, 'description' => 'NFS + biochimie',                                  'type_acte_id' => $typeExamenActe->id]);
        Acte::firstOrCreate(['libelle' => 'Radiographie thoracique'], ['cout' => 8000,  'duree' => 15, 'description' => 'Radio du thorax face et profil',                    'type_acte_id' => $typeExamenActe->id]);

        // ══════════════════════════════════════════════════════════════
        //  TYPES DE DIAGNOSTIC
        // ══════════════════════════════════════════════════════════════
        TypeDiagnostic::firstOrCreate(['libelle' => 'Clinique'],      ['description' => 'Diagnostic clinique']);
        TypeDiagnostic::firstOrCreate(['libelle' => 'Paraclinique'],  ['description' => 'Diagnostic paraclinique']);

        // ══════════════════════════════════════════════════════════════
        //  TYPES D'EXAMEN
        // ══════════════════════════════════════════════════════════════
        TypeExamen::firstOrCreate(['libelle' => 'Radiologie'],   ['description' => 'Examens radiologiques']);
        TypeExamen::firstOrCreate(['libelle' => 'Biologie'],     ['description' => 'Examens biologiques']);
        TypeExamen::firstOrCreate(['libelle' => 'Cardiologie'],  ['description' => 'Examens cardiologiques']);

        // ══════════════════════════════════════════════════════════════
        //  TYPES DE FACTURATION
        // ══════════════════════════════════════════════════════════════
        TypeFacturation::firstOrCreate(['libelle' => 'Orange Money'], ['description' => 'Paiement via Orange Money']);
        TypeFacturation::firstOrCreate(['libelle' => 'Moov Money'],   ['description' => 'Paiement via Moov Money']);
        TypeFacturation::firstOrCreate(['libelle' => 'Espèces'],      ['description' => 'Paiement en espèces']);

        // ══════════════════════════════════════════════════════════════
        //  TYPES DE SALLE
        // ══════════════════════════════════════════════════════════════
        TypeSalle::firstOrCreate(['libelle' => 'Consultation'], ['description' => 'Salle de consultation']);
        TypeSalle::firstOrCreate(['libelle' => 'Soins'],        ['description' => 'Salle de soins']);

        // ══════════════════════════════════════════════════════════════
        //  SPÉCIALITÉS MÉDICALES
        // ══════════════════════════════════════════════════════════════

        // -- Spécialités médicales --
        Specialite::firstOrCreate(['libelle' => 'Cardiologie'],         ['categorie' => 'Médicale',    'description' => 'Maladies du cœur et des vaisseaux']);
        Specialite::firstOrCreate(['libelle' => 'Neurologie'],          ['categorie' => 'Médicale',    'description' => 'Système nerveux']);
        Specialite::firstOrCreate(['libelle' => 'Gastro-entérologie'],  ['categorie' => 'Médicale',    'description' => 'Système digestif et foie']);
        Specialite::firstOrCreate(['libelle' => 'Pédiatrie'],           ['categorie' => 'Médicale',    'description' => 'Santé des enfants']);
        Specialite::firstOrCreate(['libelle' => 'Dermatologie'],        ['categorie' => 'Médicale',    'description' => 'Maladies de la peau']);
        Specialite::firstOrCreate(['libelle' => 'Pneumologie'],         ['categorie' => 'Médicale',    'description' => 'Système respiratoire']);
        Specialite::firstOrCreate(['libelle' => 'Psychiatrie'],         ['categorie' => 'Médicale',    'description' => 'Santé mentale']);
        Specialite::firstOrCreate(['libelle' => 'Endocrinologie'],      ['categorie' => 'Médicale',    'description' => 'Système hormonal']);
        Specialite::firstOrCreate(['libelle' => 'Néphrologie'],         ['categorie' => 'Médicale',    'description' => 'Maladies des reins']);
        Specialite::firstOrCreate(['libelle' => 'Oncologie'],           ['categorie' => 'Médicale',    'description' => 'Cancer']);
        Specialite::firstOrCreate(['libelle' => 'Rhumatologie'],        ['categorie' => 'Médicale',    'description' => 'Maladies articulaires']);

        // -- Spécialités chirurgicales --
        Specialite::firstOrCreate(['libelle' => 'Chirurgie générale et viscérale'],              ['categorie' => 'Chirurgicale', 'description' => 'Appareil digestif']);
        Specialite::firstOrCreate(['libelle' => 'Chirurgie orthopédique et traumatologique'],    ['categorie' => 'Chirurgicale', 'description' => 'Système locomoteur (os/articulations)']);
        Specialite::firstOrCreate(['libelle' => 'Chirurgie thoracique et cardiovasculaire'],     ['categorie' => 'Chirurgicale', 'description' => 'Cœur et poumons']);
        Specialite::firstOrCreate(['libelle' => 'Urologie'],                                    ['categorie' => 'Chirurgicale', 'description' => 'Système urinaire']);
        Specialite::firstOrCreate(['libelle' => 'Neurochirurgie'],                              ['categorie' => 'Chirurgicale', 'description' => 'Cerveau et colonne vertébrale']);
        Specialite::firstOrCreate(['libelle' => 'Chirurgie plastique, reconstructrice et esthétique'], ['categorie' => 'Chirurgicale', 'description' => 'Chirurgie plastique et esthétique']);
        Specialite::firstOrCreate(['libelle' => 'ORL et chirurgie cervico-faciale'],             ['categorie' => 'Chirurgicale', 'description' => 'Oreille, nez, gorge']);

        // -- Autres spécialités --
        Specialite::firstOrCreate(['libelle' => 'Anesthésie-réanimation'],      ['categorie' => 'Autre', 'description' => 'Gestion de la douleur et soins intensifs']);
        Specialite::firstOrCreate(['libelle' => 'Radiologie / Imagerie médicale'], ['categorie' => 'Autre', 'description' => 'Diagnostic par imagerie']);
        Specialite::firstOrCreate(['libelle' => 'Biologie médicale'],           ['categorie' => 'Autre', 'description' => 'Analyses de laboratoire']);
        Specialite::firstOrCreate(['libelle' => 'Gynécologie-Obstétrique'],     ['categorie' => 'Autre', 'description' => 'Santé des femmes et accouchements']);
        Specialite::firstOrCreate(['libelle' => 'Médecine générale'],           ['categorie' => 'Autre', 'description' => 'Soins de premier recours']);
        Specialite::firstOrCreate(['libelle' => 'Médecine d\'urgence'],         ['categorie' => 'Autre', 'description' => 'Prise en charge des urgences']);
        Specialite::firstOrCreate(['libelle' => 'Médecine du sport'],           ['categorie' => 'Autre', 'description' => 'Médecine liée à l\'activité sportive']);
        Specialite::firstOrCreate(['libelle' => 'Médecine du travail'],         ['categorie' => 'Autre', 'description' => 'Santé au travail']);
        Specialite::firstOrCreate(['libelle' => 'Médecine légale'],             ['categorie' => 'Autre', 'description' => 'Expertise médico-légale']);

        // ── Résumé ────────────────────────────────────────────────────
        $this->command?->info('Référentiels injectés avec succès.');
        $this->command?->table(
            ['Table', 'Total'],
            [
                ['pays',                      Pays::count()],
                ['localites',                  Localite::count()],
                ['grades',                     Grade::count()],
                ['type_professionnel_santes',  TypeProfessionnelSante::count()],
                ['type_structures',            TypeStructure::count()],
                ['type_actes',                 TypeActe::count()],
                ['actes',                      Acte::count()],
                ['type_diagnostics',           TypeDiagnostic::count()],
                ['type_examens',               TypeExamen::count()],
                ['type_facturations',          TypeFacturation::count()],
                ['type_salles',                TypeSalle::count()],
                ['specialites',                Specialite::count()],
            ]
        );
    }
}
