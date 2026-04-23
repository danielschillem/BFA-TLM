<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\TwoFactorCodeNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = DB::transaction(function () use ($request) {
                $user = User::create([
                    'nom' => $request->nom,
                    'prenoms' => $request->prenoms,
                    'email' => $request->email,
                    'password' => $request->password,
                    'telephone_1' => $request->telephone_1,
                    'sexe' => $request->sexe,
                ]);

                // Sécurité : hardcoder le rôle patient (l'input est ignoré en défense en profondeur)
                $user->assignRole('patient');

                // Créer automatiquement le dossier patient pour les inscriptions autonomes
                $patient = \App\Models\Patient::create([
                    'nom' => $user->nom,
                    'prenoms' => $user->prenoms,
                    'email' => $user->email,
                    'telephone_1' => $user->telephone_1,
                    'sexe' => $user->sexe,
                    'date_naissance' => $request->input('date_naissance'),
                    'lieu_naissance' => $request->input('lieu_naissance'),
                    'user_id' => $user->id,
                    'created_by_id' => $user->id,
                ]);

                \App\Models\DossierPatient::create([
                    'identifiant' => 'DOS-' . str_pad($patient->id, 6, '0', STR_PAD_LEFT),
                    'statut' => 'ouvert',
                    'date_ouverture' => now(),
                    'patient_id' => $patient->id,
                ]);

                return $user;
            });

            // Authentification par session (cookie httpOnly) — uniquement dans le contexte SPA
            if ($request->hasSession()) {
                Auth::guard('web')->login($user);
                $request->session()->regenerate();
            }

            return response()->json([
                'success' => true,
                'message' => 'Inscription réussie',
                'data' => [
                    'user' => new UserResource($user->load('roles')),
                    'requires_two_factor' => false,
                ],
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Register exception', [
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'inscription.',
            ], 500);
        }
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                Log::warning('Login failed', [
                    'email' => $request->email,
                    'user_found' => (bool) $user,
                    'input_keys' => array_keys($request->all()),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Identifiants invalides',
                ], 401);
            }

        if ($user->status !== 'actif') {
            return response()->json([
                'success' => false,
                'message' => 'Votre compte est désactivé.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);

        // 2FA pour les rôles sensibles (actif en production uniquement)
        if ($this->requiresTwoFactor($user)) {
            $challenge = $this->issueTwoFactorChallenge($user, true);

            return response()->json([
                'success' => true,
                'message' => $challenge['message'],
                'data' => [
                    'user' => new UserResource($user->load('roles', 'structure')),
                    'requires_two_factor' => true,
                    'token' => $challenge['token'],
                ],
            ]);
        }

        // Authentification par session (cookie httpOnly) — uniquement dans le contexte SPA
        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie',
            'data' => [
                'user' => new UserResource($user->load('roles', 'structure')),
                'requires_two_factor' => false,
            ],
        ]);
        } catch (\Throwable $e) {
            Log::error('Login exception', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la connexion.',
            ], 500);
        }
    }

    public function resendTwoFactor(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (!$user || !$token || !$token->can('2fa-pending')) {
            return response()->json([
                'success' => false,
                'message' => 'Session 2FA invalide. Veuillez vous reconnecter.',
            ], 403);
        }

        if (!$this->requiresTwoFactor($user)) {
            return response()->json([
                'success' => false,
                'message' => 'La double authentification n\'est pas requise pour ce compte.',
            ], 422);
        }

        $challenge = $this->issueTwoFactorChallenge($user, false);

        return response()->json([
            'success' => true,
            'message' => $challenge['message'],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Révoquer le token Sanctum si présent (API token auth)
        $token = $request->user()->currentAccessToken();
        if ($token && !($token instanceof \Laravel\Sanctum\TransientToken)) {
            $token->delete();
        }

        // Invalider la session (cookie httpOnly)
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie',
        ]);
    }

    public function sessions(Request $request): JsonResponse
    {
        if (config('session.driver') !== 'database') {
            return response()->json([
                'success' => true,
                'data' => [],
                'message' => 'Session listing not available with current driver.',
            ]);
        }

        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;
        $sessions = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_activity')
            ->get()
            ->map(function ($session) use ($currentSessionId) {
                return [
                    'id' => $session->id,
                    'ip_address' => $session->ip_address,
                    'user_agent' => $session->user_agent,
                    'last_activity_at' => now()->setTimestamp((int) $session->last_activity)->toIso8601String(),
                    'current' => $currentSessionId !== null && hash_equals($currentSessionId, (string) $session->id),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $sessions,
        ]);
    }

    public function revokeSession(string $sessionId, Request $request): JsonResponse
    {
        if (config('session.driver') !== 'database') {
            return response()->json([
                'success' => false,
                'message' => 'Session revocation unavailable with current driver.',
            ], 422);
        }

        $deleted = DB::table('sessions')
            ->where('id', $sessionId)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Session introuvable.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Session révoquée.',
        ]);
    }

    public function revokeOtherSessions(Request $request): JsonResponse
    {
        if (config('session.driver') !== 'database' || !$request->hasSession()) {
            return response()->json([
                'success' => false,
                'message' => 'Action indisponible avec la configuration actuelle.',
            ], 422);
        }

        $deletedCount = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Autres sessions révoquées.',
            'data' => ['revoked_count' => $deletedCount],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user()->load('roles', 'structure', 'service')),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $request->validate([
            'first_name'   => 'sometimes|string|max:255',
            'last_name'    => 'sometimes|string|max:255',
            'nom'          => 'sometimes|string|max:255',
            'prenoms'      => 'sometimes|string|max:255',
            'phone'        => 'nullable|string|max:20',
            'telephone_1'  => 'nullable|string|max:20',
            'specialite'   => 'nullable|string|max:255',
        ]);

        $updateData = array_filter([
            'nom'          => $request->input('last_name', $request->input('nom')),
            'prenoms'      => $request->input('first_name', $request->input('prenoms')),
            'telephone_1'  => $request->input('phone', $request->input('telephone_1')),
            'specialite'   => $request->input('specialite'),
        ], fn ($v) => $v !== null);

        $request->user()->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour',
            'data' => new UserResource($request->user()->fresh()->load('roles')),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'string', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()->uncompromised()],
        ]);

        if (!Hash::check($request->current_password, $request->user()->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe actuel incorrect',
            ], 422);
        }

        $request->user()->update(['password' => $request->password]);
        $this->invalidateUserSessions($request->user(), $request->hasSession() ? $request->session()->getId() : null);

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe modifié',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if ($user) {
            // Supprimer les anciens tokens
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();

            // Générer un nouveau token
            $token = Str::random(64);
            DB::table('password_reset_tokens')->insert([
                'email' => $user->email,
                'token' => Hash::make($token),
                'created_at' => now(),
            ]);

            try {
                $user->notify(new ResetPasswordNotification($token));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send password reset email', ['user' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        // Toujours retourner le même message pour ne pas révéler l'existence du compte
        return response()->json([
            'success' => true,
            'message' => 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => ['required', 'string', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()->uncompromised()],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Token de réinitialisation invalide.',
            ], 422);
        }

        $expirationMinutes = (int) config('auth.passwords.users.expire', 60);

        // Vérifier expiration
        if (now()->diffInMinutes($record->created_at) > $expirationMinutes) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Le token de réinitialisation a expiré.',
            ], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => $request->password]);

        // Nettoyer le token utilisé
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Révoquer tous les tokens d'accès existants
        $user->tokens()->delete();
        $this->invalidateUserSessions($user);

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe réinitialisé avec succès.',
        ]);
    }

    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (!$user || !$token || !$token->can('2fa-pending')) {
            return response()->json([
                'success' => false,
                'message' => 'Session 2FA invalide. Veuillez vous reconnecter.',
            ], 403);
        }

        if ((int) $request->user_id !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur 2FA invalide.',
            ], 403);
        }

        if (!$user->two_factor_code || !$user->two_factor_expires_at) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun code de vérification en attente.',
            ], 422);
        }

        if (now()->greaterThan($user->two_factor_expires_at)) {
            $user->update([
                'two_factor_code' => null,
                'two_factor_expires_at' => null,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Le code de vérification a expiré. Veuillez vous reconnecter.',
            ], 422);
        }

        if (!Hash::check($request->code, $user->two_factor_code)) {
            // ── Protection brute-force 2FA ──
            $cacheKey = '2fa_attempts_' . $user->id;
            $attempts = (int) cache($cacheKey, 0) + 1;
            cache([$cacheKey => $attempts], now()->addMinutes(10));

            if ($attempts >= 5) {
                // Invalider le code et forcer un nouveau login
                $user->update([
                    'two_factor_code' => null,
                    'two_factor_expires_at' => null,
                ]);
                $user->tokens()->where('name', '2fa-pending')->delete();
                cache()->forget($cacheKey);

                return response()->json([
                    'success' => false,
                    'message' => 'Trop de tentatives. Veuillez vous reconnecter.',
                    'locked' => true,
                ], 429);
            }

            return response()->json([
                'success' => false,
                'message' => 'Code de vérification invalide.',
                'remaining_attempts' => 5 - $attempts,
            ], 422);
        }

        // Réinitialiser le compteur de tentatives après succès
        cache()->forget('2fa_attempts_' . $user->id);

        // Invalider le code utilisé
        $user->update([
            'two_factor_code' => null,
            'two_factor_expires_at' => null,
        ]);

        // Révoquer le token 2fa-pending et authentifier par session
        $user->tokens()->where('name', '2fa-pending')->delete();

        // Authentification par session (cookie httpOnly) — uniquement dans le contexte SPA
        if (request()->hasSession()) {
            Auth::guard('web')->login($user);
            request()->session()->regenerate();
        }

        return response()->json([
            'success' => true,
            'message' => 'Code vérifié avec succès.',
            'data' => [
                'user' => new UserResource($user->load('roles', 'structure')),
                'requires_two_factor' => false,
            ],
        ]);
    }

    private function requiresTwoFactor(User $user): bool
    {
        // 2FA désactivé — à réactiver quand le service email sera opérationnel en production
        return false;
        // return $user->hasRole(['doctor', 'specialist', 'admin']);
    }

    private function issueTwoFactorChallenge(User $user, bool $withPendingToken): array
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->tokens()->where('name', '2fa-pending')->delete();

        $user->update([
            'two_factor_code' => Hash::make($code),
            'two_factor_expires_at' => now()->addMinutes(10),
        ]);

        try {
            $user->notify(new TwoFactorCodeNotification($code));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send 2FA code email', ['user' => $user->id, 'error' => $e->getMessage()]);
        }

        return [
            'message' => 'Code de vérification envoyé par email',
            'token' => $withPendingToken
                ? $user->createToken('2fa-pending', ['2fa-pending'])->plainTextToken
                : null,
        ];
    }

    private function invalidateUserSessions(User $user, ?string $exceptSessionId = null): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        $query = DB::table('sessions')->where('user_id', $user->id);
        if ($exceptSessionId) {
            $query->where('id', '!=', $exceptSessionId);
        }
        $query->delete();
    }
}
