<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Réinitialiser le cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ── Permissions ───────────────────────────────────────────────
        $permissions = [
            // Patients
            'patients.view', 'patients.create', 'patients.update', 'patients.delete',
            // Dossiers médicaux
            'dossiers.view', 'dossiers.update',
            // Consultations
            'consultations.view', 'consultations.create', 'consultations.update',
            // Rendez-vous
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
            // Prescriptions
            'prescriptions.view', 'prescriptions.create', 'prescriptions.sign',
            // Diagnostics
            'diagnostics.view', 'diagnostics.create',
            // Examens
            'examens.view', 'examens.create', 'examens.update',
            // Documents
            'documents.view', 'documents.upload', 'documents.delete',
            // Messages
            'messages.view', 'messages.send',
            // Téléexpertise
            'teleexpertise.view', 'teleexpertise.create', 'teleexpertise.respond',
            // Admin
            'admin.dashboard', 'admin.users', 'admin.audit',
            // Structures
            'structures.view', 'structures.manage',
            // Types de structure
            'type_structures.view', 'type_structures.manage',
            // Gestion des utilisateurs (gestionnaire)
            'users.create', 'users.update', 'users.view',
            // Paiements
            'payments.initiate', 'payments.confirm', 'payments.validate', 'payments.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'api']);
        }

        // ── Rôles ─────────────────────────────────────────────────────
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $admin->syncPermissions($permissions);

        $doctor = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'api']);
        $doctor->syncPermissions([
            'patients.view', 'patients.create', 'patients.update',
            'dossiers.view', 'dossiers.update',
            'consultations.view', 'consultations.create', 'consultations.update',
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
            'prescriptions.view', 'prescriptions.create', 'prescriptions.sign',
            'diagnostics.view', 'diagnostics.create',
            'examens.view', 'examens.create', 'examens.update',
            'documents.view', 'documents.upload',
            'messages.view', 'messages.send',
            'teleexpertise.view', 'teleexpertise.create', 'teleexpertise.respond',
            'payments.initiate', 'payments.validate', 'payments.view',
        ]);

        $specialist = Role::firstOrCreate(['name' => 'specialist', 'guard_name' => 'api']);
        $specialist->syncPermissions($doctor->permissions->pluck('name')->toArray());

        $healthPro = Role::firstOrCreate(['name' => 'health_professional', 'guard_name' => 'api']);
        $healthPro->syncPermissions([
            'patients.view', 'patients.create',
            'dossiers.view',
            'consultations.view',
            'appointments.view', 'appointments.create',
            'documents.view', 'documents.upload',
            'messages.view', 'messages.send',
        ]);

        $patient = Role::firstOrCreate(['name' => 'patient', 'guard_name' => 'api']);
        $patient->syncPermissions([
            'appointments.view', 'appointments.create', 'appointments.cancel',
            'dossiers.view',
            'documents.view',
            'messages.view', 'messages.send',
            'prescriptions.view',
            'payments.initiate', 'payments.confirm', 'payments.view',
        ]);

        $manager = Role::firstOrCreate(['name' => 'structure_manager', 'guard_name' => 'api']);
        $manager->syncPermissions([
            'patients.view',
            'appointments.view',
            'consultations.view',
            'structures.view', 'structures.manage',
            'admin.dashboard',
            'messages.view', 'messages.send',
            // Gestion des PS
            'users.create', 'users.update', 'users.view',
        ]);
    }
}
