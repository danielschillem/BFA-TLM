<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class IdentifierService
{
    const TYPE_IPP       = 'IPP';  // Identifiant Permanent du Patient
    const TYPE_DOSSIER   = 'DOS';  // Dossier Patient
    const TYPE_STRUCTURE = 'STR';  // Structure sanitaire
    const TYPE_PS        = 'PST';  // Professionnel de Santé
    const TYPE_USER      = 'USR';  // Utilisateur général

    /**
     * Génère un identifiant unique au format BFA-LPK-{TYPE}-{HASH}.
     * Le HASH (8 caractères hexadécimaux majuscules) est dérivé des
     * traits d'identification stricts + entropie cryptographique (random_bytes).
     */
    public static function generate(string $type, array $traits = [], ?string $table = null, ?string $column = null): string
    {
        $maxAttempts = 10;

        for ($i = 0; $i < $maxAttempts; $i++) {
            $identifier = self::build($type, $traits);

            if ($table && $column) {
                if (!DB::table($table)->where($column, $identifier)->exists()) {
                    return $identifier;
                }
            } else {
                return $identifier;
            }
        }

        // Dernier recours : entropie supplémentaire
        return self::build($type, array_merge($traits, [microtime(true), random_int(0, PHP_INT_MAX)]));
    }

    /**
     * Construit l'identifiant : BFA-LPK-{TYPE}-{8 hex chars}
     *
     * Le hash combine :
     * - Les traits d'identité (nom, date naissance, sexe, etc.)
     * - 16 octets de random_bytes (entropie cryptographique)
     */
    private static function build(string $type, array $traits): string
    {
        $traitsString = implode('|', array_filter(array_map('strval', $traits)));
        $entropy = $traitsString . bin2hex(random_bytes(8));
        $hash = strtoupper(substr(hash('sha256', $entropy), 0, 8));

        return "BFA-LPK-{$type}-{$hash}";
    }

    public static function generateIPP(array $traits = []): string
    {
        return self::generate(self::TYPE_IPP, $traits, 'patients', 'ipp');
    }

    public static function generateDossier(array $traits = []): string
    {
        return self::generate(self::TYPE_DOSSIER, $traits, 'dossier_patients', 'identifiant');
    }

    public static function generateStructure(array $traits = []): string
    {
        return self::generate(self::TYPE_STRUCTURE, $traits, 'structures', 'code_structure');
    }

    public static function generatePS(array $traits = []): string
    {
        return self::generate(self::TYPE_PS, $traits, 'users', 'identifiant_national');
    }

    public static function generateUser(array $traits = []): string
    {
        return self::generate(self::TYPE_USER, $traits, 'users', 'identifiant_national');
    }
}
