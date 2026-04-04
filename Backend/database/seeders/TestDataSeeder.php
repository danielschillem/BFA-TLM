<?php

namespace Database\Seeders;

use App\Models\Acte;
use App\Models\Allergie;
use App\Models\Announcement;
use App\Models\Antecedent;
use App\Models\AntecedentMedicamenteux;
use App\Models\Anthropometrie;
use App\Models\Constante;
use App\Models\Consultation;
use App\Models\Diagnostic;
use App\Models\DossierPatient;
use App\Models\Examen;
use App\Models\ExamenClinique;
use App\Models\Grade;
use App\Models\HabitudeDeVie;
use App\Models\Localite;
use App\Models\Message;
use App\Models\Paiement;
use App\Models\Patient;
use App\Models\Pays;
use App\Models\Prescription;
use App\Models\RendezVous;
use App\Models\Salle;
use App\Models\Service;
use App\Models\Structure;
use App\Models\Teleexpertise;
use App\Models\Traitement;
use App\Models\TypeActe;
use App\Models\TypeDiagnostic;
use App\Models\TypeExamen;
use App\Models\TypeFacturation;
use App\Models\TypeProfessionnelSante;
use App\Models\TypeSalle;
use App\Models\TypeStructure;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── Garantir que les rôles/permissions existent ────────────────
        if (\Spatie\Permission\Models\Role::count() === 0) {
            $this->call(RolePermissionSeeder::class);
        }

        // ══════════════════════════════════════════════════════════════
        //  RÉFÉRENTIELS
        // ══════════════════════════════════════════════════════════════

        // --- Pays ---
        $bf = Pays::firstOrCreate(['code' => 'BF'], ['nom' => 'Burkina Faso', 'indicatif' => '+226']);
        Pays::firstOrCreate(['code' => 'CI'], ['nom' => "Côte d'Ivoire", 'indicatif' => '+225']);
        Pays::firstOrCreate(['code' => 'ML'], ['nom' => 'Mali', 'indicatif' => '+223']);

        // --- Localités ---
        $ouaga = Localite::firstOrCreate(
            ['commune' => 'Ouagadougou', 'pays_id' => $bf->id],
            ['region' => 'Centre', 'province' => 'Kadiogo']
        );
        $bobo = Localite::firstOrCreate(
            ['commune' => 'Bobo-Dioulasso', 'pays_id' => $bf->id],
            ['region' => 'Hauts-Bassins', 'province' => 'Houet']
        );

        // --- Grades ---
        $gradeMedecin   = Grade::firstOrCreate(['code' => 'MED'], ['libelle' => 'Médecin']);
        $gradeInfirmier = Grade::firstOrCreate(['code' => 'INF'], ['libelle' => 'Infirmier']);
        Grade::firstOrCreate(['code' => 'SF'], ['libelle' => 'Sage-femme']);
        Grade::firstOrCreate(['code' => 'PHARM'], ['libelle' => 'Pharmacien']);

        // --- Types de professionnel de santé ---
        $tpsMedecin     = TypeProfessionnelSante::firstOrCreate(['libelle' => 'Médecin'], ['description' => 'Médecin généraliste ou spécialiste']);
        $tpsSpecialiste = TypeProfessionnelSante::firstOrCreate(['libelle' => 'Spécialiste'], ['description' => 'Spécialiste médical']);
        TypeProfessionnelSante::firstOrCreate(['libelle' => 'Infirmier'], ['description' => "Infirmier diplômé d'État"]);

        // --- Types d'actes & Actes ---
        $typeConsult = TypeActe::firstOrCreate(['libelle' => 'Consultation'], ['description' => 'Actes de consultation']);
        $typeExamenActe = TypeActe::firstOrCreate(['libelle' => 'Examen'], ['description' => 'Actes d\'examen complémentaire']);
        $typeChirurgie = TypeActe::firstOrCreate(['libelle' => 'Chirurgie'], ['description' => 'Actes chirurgicaux']);

        $acteConsultGen = Acte::firstOrCreate(['libelle' => 'Consultation générale'], ['cout' => 5000, 'duree' => 30, 'description' => 'Consultation de médecine générale', 'type_acte_id' => $typeConsult->id]);
        $acteConsultSpec = Acte::firstOrCreate(['libelle' => 'Consultation spécialisée'], ['cout' => 15000, 'duree' => 45, 'description' => 'Consultation chez un spécialiste', 'type_acte_id' => $typeConsult->id]);
        $acteECG = Acte::firstOrCreate(['libelle' => 'Électrocardiogramme (ECG)'], ['cout' => 10000, 'duree' => 20, 'description' => 'Enregistrement de l\'activité électrique du cœur', 'type_acte_id' => $typeExamenActe->id]);
        $acteEcho = Acte::firstOrCreate(['libelle' => 'Échographie abdominale'], ['cout' => 20000, 'duree' => 30, 'description' => 'Échographie de l\'abdomen', 'type_acte_id' => $typeExamenActe->id]);
        $acteBilan = Acte::firstOrCreate(['libelle' => 'Bilan sanguin complet'], ['cout' => 12000, 'duree' => 15, 'description' => 'NFS + biochimie', 'type_acte_id' => $typeExamenActe->id]);
        $acteRadio = Acte::firstOrCreate(['libelle' => 'Radiographie thoracique'], ['cout' => 8000, 'duree' => 15, 'description' => 'Radio du thorax face et profil', 'type_acte_id' => $typeExamenActe->id]);

        // --- Types de diagnostic ---
        $tdClinic = TypeDiagnostic::firstOrCreate(['libelle' => 'Clinique'], ['description' => 'Diagnostic clinique']);
        $tdParaclinique = TypeDiagnostic::firstOrCreate(['libelle' => 'Paraclinique'], ['description' => 'Diagnostic paraclinique']);

        // --- Types d'examen ---
        $teRadio = TypeExamen::firstOrCreate(['libelle' => 'Radiologie'], ['description' => 'Examens radiologiques']);
        $teBio = TypeExamen::firstOrCreate(['libelle' => 'Biologie'], ['description' => 'Examens biologiques']);
        $teCardio = TypeExamen::firstOrCreate(['libelle' => 'Cardiologie'], ['description' => 'Examens cardiologiques']);

        // --- Types facturation ---
        $tfOrange = TypeFacturation::firstOrCreate(['libelle' => 'Orange Money'], ['description' => 'Paiement via Orange Money']);
        $tfMoov = TypeFacturation::firstOrCreate(['libelle' => 'Moov Money'], ['description' => 'Paiement via Moov Money']);
        $tfEspeces = TypeFacturation::firstOrCreate(['libelle' => 'Espèces'], ['description' => 'Paiement en espèces']);

        // --- Types de salle ---
        $tsConsult = TypeSalle::firstOrCreate(['libelle' => 'Consultation'], ['description' => 'Salle de consultation']);
        $tsSoins = TypeSalle::firstOrCreate(['libelle' => 'Soins'], ['description' => 'Salle de soins']);

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 1 : Types de structure + Admin
        // ══════════════════════════════════════════════════════════════
        $typeCHU  = TypeStructure::firstOrCreate(['libelle' => 'CHU'], ['description' => 'Centre Hospitalier Universitaire', 'actif' => true]);
        $typeCMA  = TypeStructure::firstOrCreate(['libelle' => 'CMA'], ['description' => 'Centre Médical avec Antenne chirurgicale', 'actif' => true]);
        $typeCSPS = TypeStructure::firstOrCreate(['libelle' => 'CSPS'], ['description' => 'Centre de Santé et de Promotion Sociale', 'actif' => true]);

        $admin = User::firstOrCreate(
            ['email' => 'admin@tlm-bfa.bf'],
            [
                'nom' => 'OUEDRAOGO', 'prenoms' => 'Abdoul',
                'password' => 'password', 'telephone_1' => '+22670000001',
                'sexe' => 'M', 'status' => 'actif',
                'pays_id' => $bf->id, 'localite_id' => $ouaga->id,
            ]
        );
        if (!$admin->hasRole('admin')) { $admin->assignRole('admin'); }

        // Admin principal Daniel
        $adminDaniel = User::firstOrCreate(
            ['email' => 'daniel@bfa-tlm.online'],
            [
                'nom' => 'ADMINISTRATEUR', 'prenoms' => 'Daniel',
                'password' => 'password', 'telephone_1' => '+22670000000',
                'sexe' => 'M', 'status' => 'actif',
                'pays_id' => $bf->id, 'localite_id' => $ouaga->id,
            ]
        );
        if (!$adminDaniel->hasRole('admin')) { $adminDaniel->assignRole('admin'); }

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 2 : Structures + Services + Salles
        // ══════════════════════════════════════════════════════════════
        $structure = Structure::firstOrCreate(
            ['libelle' => 'CHU Yalgado Ouédraogo'],
            [
                'telephone' => '+22625306848', 'email' => 'contact@chu-yalgado.bf',
                'actif' => true, 'type_structure_id' => $typeCHU->id,
                'created_by_id' => $admin->id, 'localite_id' => $ouaga->id,
            ]
        );

        $structureCMA = Structure::firstOrCreate(
            ['libelle' => 'CMA Secteur 30'],
            [
                'telephone' => '+22625334455', 'email' => 'contact@cma-s30.bf',
                'actif' => true, 'type_structure_id' => $typeCMA->id,
                'created_by_id' => $admin->id, 'localite_id' => $ouaga->id,
            ]
        );

        $service = Service::firstOrCreate(['code' => 'MED-GEN'], ['libelle' => 'Médecine Générale', 'structure_id' => $structure->id]);
        $serviceCardio = Service::firstOrCreate(['code' => 'CARDIO'], ['libelle' => 'Cardiologie', 'structure_id' => $structure->id]);
        $servicePedia = Service::firstOrCreate(['code' => 'PEDIA'], ['libelle' => 'Pédiatrie', 'structure_id' => $structure->id]);
        $serviceCMA = Service::firstOrCreate(['code' => 'MED-GEN-CMA'], ['libelle' => 'Médecine Générale', 'structure_id' => $structureCMA->id]);

        // Salles
        $salle1 = Salle::firstOrCreate(['libelle' => 'Salle A1', 'structure_id' => $structure->id], [
            'capacite' => 1, 'equipements' => ['bureau', 'tensiomètre', 'stéthoscope'],
            'actif' => true, 'type_salle_id' => $tsConsult->id,
        ]);
        $salle2 = Salle::firstOrCreate(['libelle' => 'Salle B2', 'structure_id' => $structure->id], [
            'capacite' => 2, 'equipements' => ['ECG', 'moniteur', 'défibrillateur'],
            'actif' => true, 'type_salle_id' => $tsSoins->id,
        ]);

        $admin->update(['structure_id' => $structure->id]);

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 3 : Gestionnaire
        // ══════════════════════════════════════════════════════════════
        $gestionnaire = User::firstOrCreate(
            ['email' => 'gestionnaire@tlm-bfa.bf'],
            [
                'nom' => 'ZONGO', 'prenoms' => 'Rasmata',
                'password' => 'password', 'telephone_1' => '+22670000006',
                'sexe' => 'F', 'status' => 'actif',
                'structure_id' => $structure->id, 'created_by_id' => $admin->id,
                'pays_id' => $bf->id, 'localite_id' => $ouaga->id,
            ]
        );
        if (!$gestionnaire->hasRole('structure_manager')) { $gestionnaire->assignRole('structure_manager'); }

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 4 : Professionnels de santé (PS)
        // ══════════════════════════════════════════════════════════════
        $doctor = User::firstOrCreate(
            ['email' => 'dr.sawadogo@tlm-bfa.bf'],
            [
                'nom' => 'SAWADOGO', 'prenoms' => 'Dr. Ibrahim',
                'password' => 'password', 'telephone_1' => '+22670000002',
                'sexe' => 'M', 'specialite' => 'Médecine Générale',
                'matricule' => 'MED-001', 'numero_ordre' => 'BF-MED-2020-001',
                'status' => 'actif', 'structure_id' => $structure->id,
                'service_id' => $service->id, 'created_by_id' => $gestionnaire->id,
                'grade_id' => $gradeMedecin->id, 'type_professionnel_sante_id' => $tpsMedecin->id,
                'pays_id' => $bf->id, 'localite_id' => $ouaga->id,
            ]
        );
        if (!$doctor->hasRole('doctor')) { $doctor->assignRole('doctor'); }

        $specialist = User::firstOrCreate(
            ['email' => 'dr.compaore@tlm-bfa.bf'],
            [
                'nom' => 'COMPAORE', 'prenoms' => 'Dr. Fatimata',
                'password' => 'password', 'telephone_1' => '+22670000003',
                'sexe' => 'F', 'specialite' => 'Cardiologie',
                'matricule' => 'MED-002', 'numero_ordre' => 'BF-MED-2019-042',
                'status' => 'actif', 'structure_id' => $structure->id,
                'service_id' => $serviceCardio->id, 'created_by_id' => $gestionnaire->id,
                'grade_id' => $gradeMedecin->id, 'type_professionnel_sante_id' => $tpsSpecialiste->id,
                'pays_id' => $bf->id, 'localite_id' => $ouaga->id,
            ]
        );
        if (!$specialist->hasRole('specialist')) { $specialist->assignRole('specialist'); }

        $infirmier = User::firstOrCreate(
            ['email' => 'inf.diallo@tlm-bfa.bf'],
            [
                'nom' => 'DIALLO', 'prenoms' => 'Mariam',
                'password' => 'password', 'telephone_1' => '+22670000008',
                'sexe' => 'F', 'specialite' => 'Soins infirmiers',
                'matricule' => 'INF-001', 'status' => 'actif',
                'structure_id' => $structure->id, 'service_id' => $service->id,
                'created_by_id' => $gestionnaire->id,
                'grade_id' => $gradeInfirmier->id,
                'pays_id' => $bf->id, 'localite_id' => $ouaga->id,
            ]
        );
        if (!$infirmier->hasRole('health_professional')) { $infirmier->assignRole('health_professional'); }

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 5 : Patients + Dossiers
        // ══════════════════════════════════════════════════════════════
        $patient = Patient::firstOrCreate(
            ['telephone_1' => '+22670000004'],
            [
                'nom' => 'KABORE', 'prenoms' => 'Aminata',
                'date_naissance' => '1990-05-15', 'sexe' => 'F',
                'email' => 'patient@tlm-bfa.bf',
                'created_by_id' => $doctor->id, 'structure_id' => $structure->id,
            ]
        );
        $dossier1 = DossierPatient::firstOrCreate(
            ['patient_id' => $patient->id],
            ['identifiant' => 'DOS-000001', 'statut' => 'ouvert', 'date_ouverture' => now(), 'structure_id' => $structure->id, 'user_id' => $doctor->id]
        );

        $patient2 = Patient::firstOrCreate(
            ['telephone_1' => '+22670000005'],
            [
                'nom' => 'TRAORE', 'prenoms' => 'Moussa',
                'date_naissance' => '1985-11-20', 'sexe' => 'M',
                'created_by_id' => $specialist->id, 'structure_id' => $structure->id,
            ]
        );
        $dossier2 = DossierPatient::firstOrCreate(
            ['patient_id' => $patient2->id],
            ['identifiant' => 'DOS-000002', 'statut' => 'ouvert', 'date_ouverture' => now(), 'structure_id' => $structure->id, 'user_id' => $specialist->id]
        );

        $patient3 = Patient::firstOrCreate(
            ['telephone_1' => '+22670000009'],
            [
                'nom' => 'BARRY', 'prenoms' => 'Fatoumata',
                'date_naissance' => '2002-03-10', 'sexe' => 'F',
                'email' => 'barry.fatoumata@email.bf',
                'created_by_id' => $doctor->id, 'structure_id' => $structure->id,
            ]
        );
        $dossier3 = DossierPatient::firstOrCreate(
            ['patient_id' => $patient3->id],
            ['identifiant' => 'DOS-000003', 'statut' => 'ouvert', 'date_ouverture' => now()->subMonths(2), 'structure_id' => $structure->id, 'user_id' => $doctor->id]
        );

        // Patient autonome (inscription libre)
        $patientUser = User::firstOrCreate(
            ['email' => 'patient.autonome@tlm-bfa.bf'],
            [
                'nom' => 'SOME', 'prenoms' => 'Paul',
                'password' => 'password', 'telephone_1' => '+22670000007',
                'sexe' => 'M', 'status' => 'actif',
                'pays_id' => $bf->id, 'localite_id' => $ouaga->id,
            ]
        );
        if (!$patientUser->hasRole('patient')) { $patientUser->assignRole('patient'); }

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 6 : Constantes (signes vitaux)
        // ══════════════════════════════════════════════════════════════
        Constante::firstOrCreate(
            ['dossier_patient_id' => $dossier1->id, 'libelle' => 'Prise initiale'],
            [
                'poids' => 62.5, 'taille' => 165.0, 'imc' => 22.9,
                'temperature' => 37.2, 'tension_systolique' => 120, 'tension_diastolique' => 80,
                'frequence_cardiaque' => 72, 'frequence_respiratoire' => 16,
                'saturation_o2' => 98.0, 'glycemie' => 0.95,
                'contexte' => 'Consultation de routine', 'user_id' => $doctor->id,
            ]
        );
        Constante::firstOrCreate(
            ['dossier_patient_id' => $dossier2->id, 'libelle' => 'Urgence HTA'],
            [
                'poids' => 85.0, 'taille' => 175.0, 'imc' => 27.8,
                'temperature' => 36.8, 'tension_systolique' => 160, 'tension_diastolique' => 100,
                'frequence_cardiaque' => 88, 'frequence_respiratoire' => 20,
                'saturation_o2' => 96.0, 'glycemie' => 1.10,
                'contexte' => 'Patient hypertendu connu', 'user_id' => $specialist->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 7 : Antécédents
        // ══════════════════════════════════════════════════════════════
        Antecedent::firstOrCreate(
            ['libelle' => 'Diabète type 2', 'dossier_patient_id' => $dossier1->id],
            [
                'type' => 'medical', 'code_cim' => 'E11',
                'description' => 'Diabète de type 2 diagnostiqué en 2018',
                'date_evenement' => '2018-06-01', 'etat_actuel' => 'Sous traitement',
                'traitements' => 'Metformine 850mg x2/jour', 'user_id' => $doctor->id,
            ]
        );
        Antecedent::firstOrCreate(
            ['libelle' => 'Appendicectomie', 'dossier_patient_id' => $dossier1->id],
            [
                'type' => 'chirurgical', 'description' => 'Appendicectomie en 2015',
                'date_evenement' => '2015-09-12', 'etat_actuel' => 'Guéri',
                'user_id' => $doctor->id,
            ]
        );
        Antecedent::firstOrCreate(
            ['libelle' => 'HTA père', 'dossier_patient_id' => $dossier2->id],
            [
                'type' => 'familial', 'description' => 'Père hypertendu depuis 20 ans',
                'filiation' => 'Père', 'user_id' => $specialist->id,
            ]
        );
        Antecedent::firstOrCreate(
            ['libelle' => 'Hypertension artérielle', 'dossier_patient_id' => $dossier2->id],
            [
                'type' => 'medical', 'code_cim' => 'I10',
                'description' => 'HTA essentielle diagnostiquée en 2020',
                'date_evenement' => '2020-01-15', 'etat_actuel' => 'Sous traitement',
                'traitements' => 'Amlodipine 5mg/jour', 'user_id' => $specialist->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 8 : Allergies
        // ══════════════════════════════════════════════════════════════
        Allergie::firstOrCreate(
            ['allergenes' => 'Pénicilline', 'dossier_patient_id' => $dossier1->id],
            ['manifestations' => 'Urticaire généralisée et œdème facial', 'severite' => 'severe']
        );
        Allergie::firstOrCreate(
            ['allergenes' => 'Arachides', 'dossier_patient_id' => $dossier1->id],
            ['manifestations' => 'Réaction cutanée légère', 'severite' => 'legere']
        );
        Allergie::firstOrCreate(
            ['allergenes' => 'Aspirine', 'dossier_patient_id' => $dossier2->id],
            ['manifestations' => 'Bronchospasme', 'severite' => 'moderee']
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 9 : Habitudes de vie
        // ══════════════════════════════════════════════════════════════
        HabitudeDeVie::firstOrCreate(
            ['type' => 'Tabac', 'dossier_patient_id' => $dossier2->id],
            ['statut' => 'ancien', 'details' => 'Fumeur pendant 10 ans, sevré depuis 2021', 'date_debut' => '2011-01-01', 'date_fin' => '2021-06-01', 'intensite' => '10 cigarettes/jour']
        );
        HabitudeDeVie::firstOrCreate(
            ['type' => 'Activité physique', 'dossier_patient_id' => $dossier1->id],
            ['statut' => 'actif', 'details' => 'Marche quotidienne 30 min', 'frequence' => 'quotidienne', 'intensite' => 'modérée']
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 10 : Antécédents médicamenteux
        // ══════════════════════════════════════════════════════════════
        AntecedentMedicamenteux::firstOrCreate(
            ['nom_generique' => 'Metformine', 'dossier_patient_id' => $dossier1->id],
            [
                'nom_marque' => 'Glucophage', 'dose' => '850', 'unite' => 'mg',
                'voie_administration' => 'orale', 'duree' => 365,
                'date_debut' => '2018-06-15', 'tolerance' => 'Bonne tolérance, troubles digestifs initiaux',
            ]
        );
        AntecedentMedicamenteux::firstOrCreate(
            ['nom_generique' => 'Amlodipine', 'dossier_patient_id' => $dossier2->id],
            [
                'nom_marque' => 'Norvasc', 'dose' => '5', 'unite' => 'mg',
                'voie_administration' => 'orale', 'duree' => 730,
                'date_debut' => '2020-02-01', 'tolerance' => 'Œdèmes chevilles légers',
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 11 : RENDEZ-VOUS — cycle complet
        // ══════════════════════════════════════════════════════════════

        // RDV 1 — terminé, présentiel (Patient 1 + Dr Sawadogo)
        $rdv1 = RendezVous::firstOrCreate(
            ['date' => now()->subDays(30)->toDateString(), 'heure' => '09:00', 'patient_id' => $patient->id, 'user_id' => $doctor->id],
            [
                'type' => 'presentiel', 'motif' => 'Contrôle glycémie trimestriel',
                'priorite' => 'normale', 'statut' => 'termine',
                'structure_id' => $structure->id, 'service_id' => $service->id,
                'salle_id' => $salle1->id, 'dossier_patient_id' => $dossier1->id,
                'type_facturation_id' => $tfEspeces->id,
            ]
        );
        $rdv1->actes()->syncWithoutDetaching([$acteConsultGen->id, $acteBilan->id]);

        // RDV 2 — terminé, téléconsultation (Patient 2 + Dr Compaoré)
        $rdv2 = RendezVous::firstOrCreate(
            ['date' => now()->subDays(15)->toDateString(), 'heure' => '14:00', 'patient_id' => $patient2->id, 'user_id' => $specialist->id],
            [
                'type' => 'teleconsultation', 'motif' => 'Suivi HTA – adaptation traitement',
                'priorite' => 'haute', 'statut' => 'termine',
                'room_name' => 'tlm-rdv2-' . Str::random(8),
                'structure_id' => $structure->id, 'service_id' => $serviceCardio->id,
                'dossier_patient_id' => $dossier2->id,
                'type_facturation_id' => $tfOrange->id,
            ]
        );
        $rdv2->actes()->syncWithoutDetaching([$acteConsultSpec->id, $acteECG->id]);

        // RDV 3 — confirmé, à venir dans 2 jours, téléconsultation (Patient 1 + Dr Compaoré)
        $rdv3 = RendezVous::firstOrCreate(
            ['date' => now()->addDays(2)->toDateString(), 'heure' => '10:30', 'patient_id' => $patient->id, 'user_id' => $specialist->id],
            [
                'type' => 'teleconsultation', 'motif' => 'Bilan cardiaque de contrôle',
                'priorite' => 'normale', 'statut' => 'confirme',
                'room_name' => 'tlm-rdv3-' . Str::random(8),
                'structure_id' => $structure->id, 'service_id' => $serviceCardio->id,
                'dossier_patient_id' => $dossier1->id,
                'type_facturation_id' => $tfMoov->id,
            ]
        );
        $rdv3->actes()->syncWithoutDetaching([$acteConsultSpec->id, $acteECG->id]);

        // RDV 4 — planifié, dans 5 jours, présentiel (Patient 3 + Dr Sawadogo)
        $rdv4 = RendezVous::firstOrCreate(
            ['date' => now()->addDays(5)->toDateString(), 'heure' => '08:00', 'patient_id' => $patient3->id, 'user_id' => $doctor->id],
            [
                'type' => 'presentiel', 'motif' => 'Première consultation – douleurs abdominales',
                'priorite' => 'normale', 'statut' => 'planifie',
                'structure_id' => $structure->id, 'service_id' => $service->id,
                'salle_id' => $salle1->id, 'dossier_patient_id' => $dossier3->id,
                'type_facturation_id' => $tfEspeces->id,
            ]
        );
        $rdv4->actes()->syncWithoutDetaching([$acteConsultGen->id, $acteEcho->id]);

        // RDV 5 — annulé (Patient 2 + Dr Sawadogo)
        $rdv5 = RendezVous::firstOrCreate(
            ['date' => now()->subDays(5)->toDateString(), 'heure' => '11:00', 'patient_id' => $patient2->id, 'user_id' => $doctor->id],
            [
                'type' => 'presentiel', 'motif' => 'Consultation de suivi post-opératoire',
                'priorite' => 'normale', 'statut' => 'annule',
                'motif_annulation' => 'Patient indisponible – voyage imprévu',
                'date_annulation' => now()->subDays(6),
                'structure_id' => $structure->id, 'service_id' => $service->id,
                'dossier_patient_id' => $dossier2->id,
            ]
        );
        $rdv5->actes()->syncWithoutDetaching([$acteConsultGen->id]);

        // RDV 6 — en_cours MAINTENANT, téléconsultation (Patient 3 + Dr Compaoré) — POUR TESTER JITSI
        $rdv6 = RendezVous::firstOrCreate(
            ['date' => now()->toDateString(), 'heure' => now()->format('H:i'), 'patient_id' => $patient3->id, 'user_id' => $specialist->id],
            [
                'type' => 'teleconsultation', 'motif' => 'Urgence – palpitations et malaise',
                'priorite' => 'urgente', 'statut' => 'en_cours',
                'room_name' => 'tlm-live-' . Str::random(8),
                'structure_id' => $structure->id, 'service_id' => $serviceCardio->id,
                'dossier_patient_id' => $dossier3->id,
                'type_facturation_id' => $tfOrange->id,
            ]
        );
        $rdv6->actes()->syncWithoutDetaching([$acteConsultSpec->id, $acteECG->id]);

        // RDV 7 — confirmé, demain, présentiel suivi (Patient 2 + Dr Sawadogo)
        $rdv7 = RendezVous::firstOrCreate(
            ['date' => now()->addDay()->toDateString(), 'heure' => '15:00', 'patient_id' => $patient2->id, 'user_id' => $doctor->id],
            [
                'type' => 'suivi', 'motif' => 'Suivi post-consultation cardiologique',
                'priorite' => 'normale', 'statut' => 'confirme',
                'structure_id' => $structure->id, 'service_id' => $service->id,
                'salle_id' => $salle1->id, 'dossier_patient_id' => $dossier2->id,
                'type_facturation_id' => $tfEspeces->id,
            ]
        );
        $rdv7->actes()->syncWithoutDetaching([$acteConsultGen->id]);

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 12 : CONSULTATIONS (liées aux RDV terminés)
        // ══════════════════════════════════════════════════════════════

        // Consultation 1 — RDV 1 terminé (Patient 1, Dr Sawadogo)
        $consult1 = Consultation::firstOrCreate(
            ['rendez_vous_id' => $rdv1->id],
            [
                'motif_principal' => 'Contrôle glycémie trimestriel',
                'histoire_maladie_symptomes' => 'Patiente diabétique type 2 depuis 2018. Vient pour contrôle trimestriel. Se plaint de fatigue modérée.',
                'date' => now()->subDays(30),
                'observation' => 'Patient en bon état général. Pas de signes de décompensation.',
                'conclusion_medicale' => 'Diabète équilibré. Glycémie à jeun à 0.95 g/L.',
                'conduite_a_tenir' => 'Poursuivre Metformine. Contrôle HbA1c dans 3 mois.',
                'statut' => 'terminee', 'type_suivi' => 'initial',
                'dossier_patient_id' => $dossier1->id, 'user_id' => $doctor->id,
            ]
        );

        // Consultation 2 — RDV 2 terminé (Patient 2, Dr Compaoré)
        $consult2 = Consultation::firstOrCreate(
            ['rendez_vous_id' => $rdv2->id],
            [
                'motif_principal' => 'Suivi HTA – adaptation traitement',
                'histoire_maladie_symptomes' => 'Patient hypertendu connu. TA mal contrôlée malgré Amlodipine 5mg. Céphalées fréquentes.',
                'date' => now()->subDays(15),
                'observation' => 'TA 160/100 mmHg. Pas de signes de souffrance viscérale.',
                'conclusion_medicale' => 'HTA mal contrôlée. Nécessité d\'adaptation thérapeutique.',
                'conduite_a_tenir' => 'Augmenter Amlodipine à 10mg. Ajouter Hydrochlorothiazide 12.5mg. Contrôle TA dans 15 jours.',
                'statut' => 'terminee', 'type_suivi' => 'suivi',
                'dossier_patient_id' => $dossier2->id, 'user_id' => $specialist->id,
            ]
        );

        // Consultation 3 — RDV 6 en cours (Patient 3, Dr Compaoré)
        $consult3 = Consultation::firstOrCreate(
            ['rendez_vous_id' => $rdv6->id],
            [
                'motif_principal' => 'Palpitations et malaise',
                'histoire_maladie_symptomes' => 'Jeune femme de 22 ans. Épisodes de palpitations depuis 1 semaine. Malaise vagal ce matin.',
                'date' => now(),
                'statut' => 'en_cours',
                'dossier_patient_id' => $dossier3->id, 'user_id' => $specialist->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 13 : Anthropométrie
        // ══════════════════════════════════════════════════════════════
        Anthropometrie::firstOrCreate(
            ['consultation_id' => $consult1->id, 'patient_id' => $patient->id],
            ['taille' => 165.0, 'poids' => 62.5, 'imc' => 22.9]
        );
        Anthropometrie::firstOrCreate(
            ['consultation_id' => $consult2->id, 'patient_id' => $patient2->id],
            ['taille' => 175.0, 'poids' => 85.0, 'imc' => 27.8]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 14 : Examen clinique
        // ══════════════════════════════════════════════════════════════
        ExamenClinique::firstOrCreate(
            ['consultation_id' => $consult1->id],
            [
                'synthese_globale' => 'Examen sans particularité. Pas de neuropathie périphérique. Pieds sains.',
                'dossier_patient_id' => $dossier1->id, 'user_id' => $doctor->id,
            ]
        );
        ExamenClinique::firstOrCreate(
            ['consultation_id' => $consult2->id],
            [
                'synthese_globale' => 'HTA confirmée. Fond d\'œil normal. Pas de souffle cardiaque. Pas d\'œdème des MI.',
                'dossier_patient_id' => $dossier2->id, 'user_id' => $specialist->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 15 : Diagnostics
        // ══════════════════════════════════════════════════════════════
        $diag1 = Diagnostic::firstOrCreate(
            ['libelle' => 'Diabète type 2 équilibré', 'consultation_id' => $consult1->id],
            [
                'type' => 'principal', 'type_diagnostic_id' => $tdClinic->id,
                'code_cim' => 'E11.9', 'gravite' => 'moderee', 'statut' => 'confirme',
                'description' => 'Diabète non insulinodépendant, bien contrôlé sous Metformine.',
                'dossier_patient_id' => $dossier1->id,
            ]
        );
        $diag2 = Diagnostic::firstOrCreate(
            ['libelle' => 'HTA essentielle mal contrôlée', 'consultation_id' => $consult2->id],
            [
                'type' => 'principal', 'type_diagnostic_id' => $tdClinic->id,
                'code_cim' => 'I10', 'gravite' => 'severe', 'statut' => 'confirme',
                'description' => 'Hypertension artérielle essentielle avec TA > 140/90 sous monothérapie.',
                'dossier_patient_id' => $dossier2->id,
            ]
        );
        Diagnostic::firstOrCreate(
            ['libelle' => 'Surpoids', 'consultation_id' => $consult2->id],
            [
                'type' => 'secondaire', 'type_diagnostic_id' => $tdClinic->id,
                'code_cim' => 'E66.0', 'gravite' => 'legere', 'statut' => 'confirme',
                'description' => 'IMC 27.8 – surpoids contribuant à l\'HTA.',
                'dossier_patient_id' => $dossier2->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 16 : Examens complémentaires
        // ══════════════════════════════════════════════════════════════
        Examen::firstOrCreate(
            ['libelle' => 'Glycémie à jeun', 'consultation_id' => $consult1->id],
            [
                'type' => 'biologie', 'type_examen_id' => $teBio->id,
                'indication' => 'Contrôle diabète', 'date_demande' => now()->subDays(31),
                'date_examen' => now()->subDays(30), 'date_reception_resultat' => now()->subDays(30),
                'resultats' => '0.95 g/L (N: 0.70-1.10)', 'commentaire' => 'Valeur dans les normes',
                'statut' => 'interprete', 'urgent' => false,
                'dossier_patient_id' => $dossier1->id,
            ]
        );
        Examen::firstOrCreate(
            ['libelle' => 'HbA1c', 'consultation_id' => $consult1->id],
            [
                'type' => 'biologie', 'type_examen_id' => $teBio->id,
                'indication' => 'Équilibre glycémique 3 mois', 'date_demande' => now()->subDays(31),
                'date_examen' => now()->subDays(30), 'date_reception_resultat' => now()->subDays(29),
                'resultats' => '6.8% (objectif < 7%)', 'commentaire' => 'Équilibre glycémique satisfaisant',
                'statut' => 'interprete', 'urgent' => false,
                'dossier_patient_id' => $dossier1->id,
            ]
        );
        Examen::firstOrCreate(
            ['libelle' => 'ECG de repos', 'consultation_id' => $consult2->id],
            [
                'type' => 'cardiologie', 'type_examen_id' => $teCardio->id,
                'indication' => 'Bilan HTA', 'date_demande' => now()->subDays(16),
                'date_examen' => now()->subDays(15),
                'resultats' => 'Rythme sinusal. HVG électrique (Sokolow 38mm). Pas de trouble du rythme.',
                'commentaire' => 'Signes d\'hypertrophie ventriculaire gauche',
                'statut' => 'interprete', 'urgent' => false,
                'dossier_patient_id' => $dossier2->id,
            ]
        );
        Examen::firstOrCreate(
            ['libelle' => 'Bilan rénal', 'consultation_id' => $consult2->id],
            [
                'type' => 'biologie', 'type_examen_id' => $teBio->id,
                'indication' => 'Retentissement rénal HTA', 'date_demande' => now()->subDays(16),
                'date_examen' => now()->subDays(14),
                'resultats' => 'Créatinine 9 mg/L (N), DFG 95 mL/min, Protéinurie négative',
                'commentaire' => 'Fonction rénale préservée',
                'statut' => 'interprete', 'urgent' => false,
                'dossier_patient_id' => $dossier2->id,
            ]
        );
        Examen::firstOrCreate(
            ['libelle' => 'ECG en urgence', 'consultation_id' => $consult3->id],
            [
                'type' => 'cardiologie', 'type_examen_id' => $teCardio->id,
                'indication' => 'Palpitations et malaise', 'date_demande' => now(),
                'statut' => 'prescrit', 'urgent' => true,
                'dossier_patient_id' => $dossier3->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 17 : Traitements
        // ══════════════════════════════════════════════════════════════
        Traitement::firstOrCreate(
            ['diagnostic_id' => $diag1->id, 'consultation_id' => $consult1->id],
            [
                'type' => 'medicamenteux', 'medicaments' => 'Metformine 850mg',
                'dosages' => '1 cp matin et soir', 'posologies' => '2 fois/jour au milieu des repas',
                'duree' => '90 jours', 'statut' => 'en_cours',
            ]
        );
        Traitement::firstOrCreate(
            ['diagnostic_id' => $diag2->id, 'consultation_id' => $consult2->id],
            [
                'type' => 'medicamenteux', 'medicaments' => 'Amlodipine 10mg + Hydrochlorothiazide 12.5mg',
                'dosages' => '1 cp/jour chacun', 'posologies' => 'Matin au petit déjeuner',
                'duree' => '30 jours', 'statut' => 'en_cours',
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 18 : Prescriptions
        // ══════════════════════════════════════════════════════════════
        Prescription::firstOrCreate(
            ['denomination' => 'Metformine 850mg', 'consultation_id' => $consult1->id],
            [
                'posologie' => '1 comprimé matin et soir au milieu des repas',
                'instructions' => 'Ne pas prendre en cas de jeûne prolongé. Contrôler glycémie hebdomadaire.',
                'duree_jours' => 90, 'date_debut' => now()->subDays(30),
                'date_fin' => now()->addDays(60),
                'statut' => 'active', 'urgent' => false, 'signee' => true,
                'dossier_patient_id' => $dossier1->id,
            ]
        );
        Prescription::firstOrCreate(
            ['denomination' => 'Amlodipine 10mg', 'consultation_id' => $consult2->id],
            [
                'posologie' => '1 comprimé le matin',
                'instructions' => 'Surveillance TA quotidienne. Consultation si TA > 180/110.',
                'duree_jours' => 30, 'date_debut' => now()->subDays(15),
                'date_fin' => now()->addDays(15),
                'statut' => 'active', 'urgent' => false, 'signee' => true,
                'dossier_patient_id' => $dossier2->id,
            ]
        );
        Prescription::firstOrCreate(
            ['denomination' => 'Hydrochlorothiazide 12.5mg', 'consultation_id' => $consult2->id],
            [
                'posologie' => '1 comprimé le matin',
                'instructions' => 'Surveillance kaliémie. Boire suffisamment.',
                'duree_jours' => 30, 'date_debut' => now()->subDays(15),
                'date_fin' => now()->addDays(15),
                'statut' => 'active', 'urgent' => true, 'signee' => true,
                'dossier_patient_id' => $dossier2->id,
            ]
        );
        Prescription::firstOrCreate(
            ['denomination' => 'Paracétamol 1g', 'consultation_id' => $consult1->id],
            [
                'posologie' => '1 comprimé toutes les 6 heures si douleur',
                'instructions' => 'Ne pas dépasser 4g/jour.',
                'duree_jours' => 5, 'date_debut' => now()->subDays(30),
                'date_fin' => now()->subDays(25),
                'statut' => 'terminee', 'urgent' => false, 'signee' => true,
                'dossier_patient_id' => $dossier1->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 19 : Paiements
        // ══════════════════════════════════════════════════════════════
        Paiement::firstOrCreate(
            ['reference' => 'PAY-2025-000001'],
            [
                'montant' => '17000', 'telephone' => '+22670000004',
                'methode' => 'especes', 'statut' => 'confirme',
                'rendez_vous_id' => $rdv1->id, 'type_facturation_id' => $tfEspeces->id,
            ]
        );
        Paiement::firstOrCreate(
            ['reference' => 'PAY-2025-000002'],
            [
                'montant' => '25000', 'telephone' => '+22670000005',
                'methode' => 'orange_money', 'statut' => 'confirme',
                'code_otp' => '123456',
                'rendez_vous_id' => $rdv2->id, 'type_facturation_id' => $tfOrange->id,
            ]
        );
        Paiement::firstOrCreate(
            ['reference' => 'PAY-2025-000003'],
            [
                'montant' => '25000', 'telephone' => '+22670000004',
                'methode' => 'moov_money', 'statut' => 'en_attente',
                'rendez_vous_id' => $rdv3->id, 'type_facturation_id' => $tfMoov->id,
            ]
        );
        Paiement::firstOrCreate(
            ['reference' => 'PAY-2025-000004'],
            [
                'montant' => '25000', 'telephone' => '+22670000009',
                'methode' => 'orange_money', 'statut' => 'confirme',
                'code_otp' => '654321',
                'rendez_vous_id' => $rdv6->id, 'type_facturation_id' => $tfOrange->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 20 : Messages (conversation PS ↔ Patient)
        // ══════════════════════════════════════════════════════════════
        Message::firstOrCreate(
            ['contenu' => 'Bonjour Dr Sawadogo, je souhaitais savoir si mes résultats de glycémie sont bons.', 'sender_id' => $patientUser->id, 'recipient_id' => $doctor->id],
            ['lu' => true]
        );
        Message::firstOrCreate(
            ['contenu' => 'Bonjour M. Somé. Vos résultats sont satisfaisants, glycémie à 0.95 g/L. Continuez le traitement.', 'sender_id' => $doctor->id, 'recipient_id' => $patientUser->id],
            ['lu' => true]
        );
        Message::firstOrCreate(
            ['contenu' => 'Merci docteur ! Et pour le prochain contrôle, dans combien de temps ?', 'sender_id' => $patientUser->id, 'recipient_id' => $doctor->id],
            ['lu' => false]
        );
        Message::firstOrCreate(
            ['contenu' => 'Dr Compaoré, le patient TRAORE a des TA élevées persistantes. Pouvez-vous le prendre en charge ?', 'sender_id' => $doctor->id, 'recipient_id' => $specialist->id],
            ['lu' => true]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 21 : Téléexpertise
        // ══════════════════════════════════════════════════════════════
        Teleexpertise::firstOrCreate(
            ['titre' => 'Avis cardiologique – HTA résistante', 'demandeur_id' => $doctor->id],
            [
                'description' => 'Patient de 39 ans, HTA essentielle depuis 2020, mal contrôlée sous Amlodipine 5mg.',
                'statut' => 'repondue', 'priorite' => 'haute',
                'specialite_demandee' => 'Cardiologie',
                'resume_clinique' => 'TA 160/100, IMC 27.8, ATCD familiaux HTA. ECG: HVG.',
                'question' => 'Faut-il passer à une bithérapie ? Quel bilan complémentaire ?',
                'age_patient' => '39', 'genre_patient' => 'M',
                'reponse' => 'Oui, bithérapie recommandée : Amlodipine 10mg + HCTZ 12.5mg. Prévoir écho cardiaque et bilan rénal complet.',
                'recommandations' => 'Contrôle TA dans 15 jours. Si TA toujours > 140/90, envisager trithérapie.',
                'expert_id' => $specialist->id, 'patient_id' => $patient2->id,
            ]
        );
        Teleexpertise::firstOrCreate(
            ['titre' => 'Palpitations chez jeune femme', 'demandeur_id' => $specialist->id],
            [
                'description' => 'Femme de 22 ans, palpitations depuis 1 semaine, malaise vagal ce matin.',
                'statut' => 'en_attente', 'priorite' => 'urgente',
                'specialite_demandee' => 'Médecine interne',
                'resume_clinique' => 'Pas d\'ATCD connus. FC parfois irrégulière.',
                'question' => 'Holter ECG à réaliser ? Bilan thyroïdien nécessaire ?',
                'age_patient' => '22', 'genre_patient' => 'F',
                'expert_id' => $doctor->id, 'patient_id' => $patient3->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  ÉTAPE 22 : Annonces
        // ══════════════════════════════════════════════════════════════
        Announcement::firstOrCreate(
            ['titre' => 'Bienvenue sur TLM-BFA'],
            [
                'contenu' => 'La plateforme de télémédecine du Burkina Faso est désormais opérationnelle. Vous pouvez prendre des rendez-vous en ligne et consulter vos médecins à distance.',
                'type' => 'info', 'statut' => 'publie',
                'date_publication' => now()->subDays(30),
                'date_expiration' => now()->addMonths(6),
                'auteur_id' => $admin->id,
            ]
        );
        Announcement::firstOrCreate(
            ['titre' => 'Maintenance prévue le week-end'],
            [
                'contenu' => 'Une maintenance est prévue ce samedi de 22h à 2h. La plateforme sera temporairement indisponible.',
                'type' => 'maintenance', 'statut' => 'publie',
                'date_publication' => now()->subDays(2),
                'date_expiration' => now()->addDays(5),
                'auteur_id' => $admin->id,
            ]
        );
        Announcement::firstOrCreate(
            ['titre' => 'Campagne de vaccination – Méningite'],
            [
                'contenu' => 'Campagne nationale de vaccination contre la méningite du 15 au 30 du mois. Présentez-vous au CSPS le plus proche.',
                'type' => 'urgent', 'statut' => 'publie',
                'date_publication' => now(),
                'date_expiration' => now()->addDays(15),
                'auteur_id' => $gestionnaire->id,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        //  RÉSUMÉ
        // ══════════════════════════════════════════════════════════════
        $this->command->info('');
        $this->command->info('╔══════════════════════════════════════════════════════════╗');
        $this->command->info('║       DONNÉES DÉMO TLM-BFA INJECTÉES AVEC SUCCÈS        ║');
        $this->command->info('╠══════════════════════════════════════════════════════════╣');
        $this->command->info('║ COMPTES UTILISATEURS (mot de passe: password)            ║');
        $this->command->info('║──────────────────────────────────────────────────────────║');
        $this->command->info('║  Admin        : admin@tlm-bfa.bf                         ║');
        $this->command->info('║  Gestionnaire : gestionnaire@tlm-bfa.bf                  ║');
        $this->command->info('║  Médecin      : dr.sawadogo@tlm-bfa.bf                   ║');
        $this->command->info('║  Spécialiste  : dr.compaore@tlm-bfa.bf                   ║');
        $this->command->info('║  Infirmier    : inf.diallo@tlm-bfa.bf                    ║');
        $this->command->info('║  Patient auto : patient.autonome@tlm-bfa.bf              ║');
        $this->command->info('╠══════════════════════════════════════════════════════════╣');
        $this->command->info('║ PATIENTS                                                 ║');
        $this->command->info('║  KABORE Aminata  (+22670000004) → Dossier DOS-000001     ║');
        $this->command->info('║  TRAORE Moussa   (+22670000005) → Dossier DOS-000002     ║');
        $this->command->info('║  BARRY Fatoumata (+22670000009) → Dossier DOS-000003     ║');
        $this->command->info('╠══════════════════════════════════════════════════════════╣');
        $this->command->info('║ RENDEZ-VOUS                                              ║');
        $this->command->info('║  7 RDV : 2 terminés, 2 confirmés, 1 planifié,            ║');
        $this->command->info('║          1 en cours (visio Jitsi), 1 annulé              ║');
        $this->command->info('║ CONSULTATIONS : 3 (2 terminées + 1 en cours)             ║');
        $this->command->info('║ PAIEMENTS     : 4 (3 confirmés + 1 en attente)           ║');
        $this->command->info('║ TÉLÉEXPERTISE : 2 (1 répondue + 1 en attente)            ║');
        $this->command->info('║ ANNONCES      : 3 publiées                               ║');
        $this->command->info('╚══════════════════════════════════════════════════════════╝');
    }
}
