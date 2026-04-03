<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group', 'label', 'description'];

    /**
     * Récupère une valeur de paramètre avec mise en cache.
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        return Cache::remember("platform_setting_{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            if (!$setting) return $default;

            return match ($setting->type) {
                'integer' => (int) $setting->value,
                'decimal' => (float) $setting->value,
                'boolean' => in_array(strtolower($setting->value), ['true', '1', 'yes', 'on']),
                'json' => json_decode($setting->value, true),
                default => $setting->value,
            };
        });
    }

    /**
     * Met à jour un paramètre et invalide le cache.
     */
    public static function setValue(string $key, mixed $value): bool
    {
        $setting = static::where('key', $key)->first();
        if (!$setting) return false;

        $stringValue = is_bool($value) ? ($value ? 'true' : 'false')
            : (is_array($value) ? json_encode($value) : (string) $value);

        $setting->update(['value' => $stringValue]);
        Cache::forget("platform_setting_{$key}");

        return true;
    }

    /**
     * Récupère le frais de service plateforme (FCFA).
     */
    public static function getPlatformFee(): int
    {
        if (!static::getValue('platform_fee_enabled', true)) {
            return 0;
        }
        return static::getValue('platform_fee', 500);
    }

    /**
     * Récupère le taux de frais mobile money (%).
     */
    public static function getMobileMoneyRate(): float
    {
        return static::getValue('mobile_money_rate', 1.5);
    }

    /**
     * Calcule les frais mobile money sur un montant.
     */
    public static function calculateMobileMoneyFee(float $amount): float
    {
        $rate = static::getMobileMoneyRate();
        return round($amount * $rate / 100, 0); // Arrondi au FCFA
    }

    /**
     * Calcule le montant total avec tous les frais.
     * Retourne un tableau détaillé.
     */
    public static function calculateTotalWithFees(float $consultationAmount): array
    {
        $platformFee = static::getPlatformFee();
        $subtotal = $consultationAmount + $platformFee;
        $mobileMoneyFee = static::calculateMobileMoneyFee($subtotal);
        $total = $subtotal + $mobileMoneyFee;

        return [
            'consultation_amount' => (float) $consultationAmount,
            'platform_fee' => (float) $platformFee,
            'mobile_money_fee' => (float) $mobileMoneyFee,
            'mobile_money_rate' => static::getMobileMoneyRate(),
            'total' => (float) $total,
        ];
    }

    /**
     * Récupère tous les paramètres groupés.
     */
    public static function getAllGrouped(): array
    {
        return static::all()
            ->groupBy('group')
            ->map(fn ($items) => $items->map(fn ($item) => [
                'key' => $item->key,
                'value' => static::getValue($item->key),
                'type' => $item->type,
                'label' => $item->label,
                'description' => $item->description,
            ]))
            ->toArray();
    }
}
