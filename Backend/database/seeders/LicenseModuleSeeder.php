<?php

namespace Database\Seeders;

use App\Models\LicenseModule;
use Illuminate\Database\Seeder;

class LicenseModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            [
                'code'               => 'core',
                'libelle'            => 'Module de base',
                'description'        => 'Gestion patients, dossiers médicaux, rendez-vous, consultations, prescriptions, examens, diagnostics',
                'prix_unitaire_fcfa' => 0,
                'inclus_base'        => true,
            ],
            [
                'code'               => 'auth_rbac',
                'libelle'            => 'Authentification & RBAC',
                'description'        => 'OAuth2 Passport, rôles & permissions Spatie, 2FA, gestion utilisateurs',
                'prix_unitaire_fcfa' => 0,
                'inclus_base'        => true,
            ],
            [
                'code'               => 'teleexpertise',
                'libelle'            => 'Téléexpertise',
                'description'        => 'Demandes d\'avis spécialisés à distance, flux de travail expert/requérant',
                'prix_unitaire_fcfa' => 300_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'fhir',
                'libelle'            => 'Interopérabilité HL7 FHIR R4',
                'description'        => '25 routes, 12 ressources FHIR, CapabilityStatement, Patient/$everything',
                'prix_unitaire_fcfa' => 500_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'cda',
                'libelle'            => 'Documents CDA R2 / C-CDA 2.1',
                'description'        => 'CCD, Consultation Note, Patient Summary, validation XML, stylesheet XSLT',
                'prix_unitaire_fcfa' => 400_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'dicom',
                'libelle'            => 'Imagerie médicale DICOM',
                'description'        => 'Intégration dcm4chee PACS, QIDO-RS, WADO-RS, STOW-RS, viewer OHIF',
                'prix_unitaire_fcfa' => 750_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'icd11',
                'libelle'            => 'Classification OMS CIM-11',
                'description'        => 'Recherche, codage, validation, crosswalk CIM-10, import chapitres',
                'prix_unitaire_fcfa' => 200_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'snomed_atc',
                'libelle'            => 'Terminologies SNOMED CT + ATC',
                'description'        => 'Recherche SNOMED CT (Snowstorm), classification ATC médicaments',
                'prix_unitaire_fcfa' => 250_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'dhis2',
                'libelle'            => 'Interopérabilité DHIS2 / ENDOS',
                'description'        => 'Push indicateurs TLM, mapping org units, synchronisation ENDOS-BFA',
                'prix_unitaire_fcfa' => 350_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'websocket',
                'libelle'            => 'Temps réel WebSocket',
                'description'        => 'Notifications push, messagerie temps réel, statut consultation live',
                'prix_unitaire_fcfa' => 200_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'paiements',
                'libelle'            => 'Facturation & Paiements',
                'description'        => 'Initiation, confirmation, validation paiements, factures PDF',
                'prix_unitaire_fcfa' => 300_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'certificat_deces',
                'libelle'            => 'Certificats de décès OMS',
                'description'        => 'Modèle international OMS, codage CIM-11, workflow certification/validation',
                'prix_unitaire_fcfa' => 150_000,
                'inclus_base'        => false,
            ],
            [
                'code'               => 'audit',
                'libelle'            => 'Audit & Traçabilité',
                'description'        => 'Journal d\'activité complet, rapports d\'audit, conformité RGPD',
                'prix_unitaire_fcfa' => 0,
                'inclus_base'        => true,
            ],
        ];

        foreach ($modules as $module) {
            LicenseModule::updateOrCreate(
                ['code' => $module['code']],
                $module
            );
        }
    }
}
