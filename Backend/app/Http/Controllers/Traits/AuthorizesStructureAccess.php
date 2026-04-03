<?php

namespace App\Http\Controllers\Traits;

use App\Models\DossierPatient;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Model;

/**
 * Trait fournissant des méthodes d'autorisation basées sur la structure
 * pour prévenir les vulnérabilités IDOR (Insecure Direct Object References).
 *
 * Règle : un utilisateur ne peut accéder qu'aux ressources de sa propre structure,
 * sauf s'il a le rôle admin.
 */
trait AuthorizesStructureAccess
{
    /**
     * Vérifie que l'utilisateur a accès à un patient donné (même structure ou patient autonome).
     */
    protected function authorizePatientAccess(Patient $patient): void
    {
        $user = request()->user();
        if ($user->hasRole('admin')) {
            return;
        }
        // Un patient autonome peut accéder à sa propre fiche
        if ($user->hasRole('patient') && $patient->user_id === $user->id) {
            return;
        }
        // Un PS peut accéder aux patients de sa structure
        if ($user->structure_id && $patient->structure_id === $user->structure_id) {
            return;
        }
        abort(403, 'Accès non autorisé à ce patient.');
    }

    /**
     * Vérifie que l'utilisateur a accès à un dossier patient donné.
     */
    protected function authorizeDossierAccess(int $dossierId): void
    {
        $dossier = DossierPatient::with('patient')->findOrFail($dossierId);
        $this->authorizePatientAccess($dossier->patient);
    }

    /**
     * Vérifie l'accès à une ressource liée à un dossier patient
     * (antécédent, allergie, diagnostic, examen, traitement, habitude de vie, etc.).
     */
    protected function authorizeDossierResource(Model $resource): void
    {
        if (!$resource->dossier_patient_id) {
            return;
        }
        $this->authorizeDossierAccess($resource->dossier_patient_id);
    }

    /**
     * Vérifie que l'utilisateur a accès à une structure donnée.
     */
    protected function authorizeStructureAccess(int $structureId): void
    {
        $user = request()->user();
        if ($user->hasRole('admin')) {
            return;
        }
        if ($user->structure_id && (int) $user->structure_id === $structureId) {
            return;
        }
        abort(403, 'Accès non autorisé à cette structure.');
    }

    /**
     * Filtre un query builder par la structure de l'utilisateur (sauf admin).
     * Les patients autonomes ne voient que leurs propres enregistrements.
     */
    protected function scopeByStructure($query, ?string $column = 'structure_id')
    {
        $user = request()->user();
        if ($user->hasRole('admin')) {
            return $query;
        }
        // Patient autonome : filtrer par user_id (sa propre fiche)
        if ($user->hasRole('patient')) {
            return $query->where('user_id', $user->id);
        }
        return $query->where($column, $user->structure_id);
    }

    /**
     * Filtre un query builder par les patients de la structure de l'utilisateur.
     * Pour les modèles liés via dossier_patient → patient → structure_id.
     */
    protected function scopeByStructureViaPatient($query)
    {
        $user = request()->user();
        if ($user->hasRole('admin')) {
            return $query;
        }
        return $query->whereHas('dossierPatient.patient', function ($q) use ($user) {
            $q->where('structure_id', $user->structure_id);
        });
    }
}
