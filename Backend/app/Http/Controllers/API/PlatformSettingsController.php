<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlatformSettingsController extends Controller
{
    /**
     * Récupérer tous les paramètres (admin uniquement).
     * GET /admin/settings
     */
    public function index(): JsonResponse
    {
        $settings = PlatformSetting::getAllGrouped();

        return response()->json([
            'success' => true,
            'data'    => $settings,
        ]);
    }

    /**
     * Récupérer les paramètres publics (frais affichés au patient).
     * GET /payments/settings
     */
    public function publicSettings(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'platform_fee'         => PlatformSetting::getPlatformFee(),
                'platform_fee_enabled' => PlatformSetting::getValue('platform_fee_enabled', true),
                'mobile_money_rate'    => PlatformSetting::getMobileMoneyRate(),
            ],
        ]);
    }

    /**
     * Mettre à jour un paramètre (admin uniquement).
     * PUT /admin/settings/{key}
     */
    public function update(string $key, Request $request): JsonResponse
    {
        $request->validate([
            'value' => 'required',
        ]);

        $setting = PlatformSetting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Paramètre non trouvé.',
            ], 404);
        }

        PlatformSetting::setValue($key, $request->input('value'));

        return response()->json([
            'success' => true,
            'message' => 'Paramètre mis à jour.',
            'data'    => [
                'key'   => $key,
                'value' => PlatformSetting::getValue($key),
            ],
        ]);
    }

    /**
     * Mettre à jour plusieurs paramètres en batch (admin uniquement).
     * PUT /admin/settings
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
        ]);

        $updated = [];
        foreach ($request->input('settings') as $item) {
            if (PlatformSetting::setValue($item['key'], $item['value'])) {
                $updated[] = $item['key'];
            }
        }

        return response()->json([
            'success' => true,
            'message' => count($updated) . ' paramètre(s) mis à jour.',
            'updated' => $updated,
        ]);
    }
}
