<?php

namespace App\Services;

use Firebase\JWT\JWT;

class JitsiService
{
    private string $appId;
    private string $apiKeyId;
    private string $privateKey;
    private int $ttl;

    public function __construct()
    {
        $this->appId = config('jitsi.app_id');
        $this->apiKeyId = config('jitsi.api_key_id');
        $this->ttl = config('jitsi.token_ttl', 120);
        $this->privateKey = $this->resolvePrivateKey();
    }

    /**
     * Vérifie si la génération JWT est disponible (clé privée configurée).
     */
    public function isEnabled(): bool
    {
        return $this->privateKey !== '' && $this->apiKeyId !== '';
    }

    /**
     * Générer un JWT JaaS 8x8.vc pour un utilisateur et une room donnés.
     */
    public function generateToken(
        string $roomName,
        string $userName,
        string $userId,
        string $email = '',
        bool $isModerator = false,
    ): ?string {
        if (!$this->isEnabled()) {
            return null;
        }

        $now = time();

        $payload = [
            'aud' => 'jitsi',
            'iss' => 'chat',
            'sub' => $this->appId,
            'room' => '*',
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + ($this->ttl * 60),
            'context' => [
                'user' => [
                    'moderator' => $isModerator ? 'true' : 'false',
                    'name' => $userName,
                    'id' => (string) $userId,
                    'email' => $email,
                ],
                'features' => [
                    'livestreaming' => 'false',
                    'recording' => $isModerator ? 'true' : 'false',
                    'transcription' => 'false',
                    'outbound-call' => 'false',
                ],
            ],
        ];

        return JWT::encode($payload, $this->privateKey, 'RS256', $this->apiKeyId);
    }

    /**
     * Résoudre la clé privée depuis la config (contenu PEM ou fichier).
     */
    private function resolvePrivateKey(): string
    {
        $key = config('jitsi.private_key', '');
        if ($key !== '') {
            // Support des \n échappés dans les variables d'env
            return str_replace('\\n', "\n", $key);
        }

        $path = config('jitsi.private_key_path', '');
        if ($path !== '') {
            // Résoudre les chemins relatifs via base_path() (ex: storage/jaas.key)
            $resolved = file_exists($path) ? $path : base_path($path);
            if (file_exists($resolved)) {
                return file_get_contents($resolved);
            }
        }

        return '';
    }
}
