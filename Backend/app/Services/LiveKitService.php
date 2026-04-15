<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Log;

class LiveKitService
{
    private string $apiKey;
    private string $apiSecret;
    private int $ttl;

    public function __construct()
    {
        $this->apiKey = config('livekit.api_key', '');
        $this->apiSecret = config('livekit.api_secret', '');
        $this->ttl = (int) config('livekit.token_ttl', 120);
    }

    public function isEnabled(): bool
    {
        return $this->apiKey !== '' && $this->apiSecret !== '';
    }

    /**
     * Générer un access token LiveKit pour rejoindre une room.
     */
    public function generateToken(
        string $roomName,
        string $participantName,
        string $participantId,
        bool $canPublish = true,
        bool $canSubscribe = true,
    ): ?string {
        if (!$this->isEnabled()) {
            return null;
        }

        if (strlen($this->apiKey) < 5 || strlen($this->apiSecret) < 10) {
            Log::error('[LiveKit] API key or secret is too short — refusing to generate token', [
                'api_key_length' => strlen($this->apiKey),
            ]);
            return null;
        }

        $now = time();

        // LiveKit access token spec:
        // https://docs.livekit.io/home/get-started/authentication/
        $payload = [
            'iss' => $this->apiKey,
            'sub' => $participantId,
            'name' => $participantName,
            'nbf' => $now,
            'exp' => $now + ($this->ttl * 60),
            'jti' => $participantId . '-' . $now,
            'video' => [
                'roomJoin' => true,
                'room' => $roomName,
                'canPublish' => $canPublish,
                'canSubscribe' => $canSubscribe,
                'canPublishData' => true,
            ],
            'metadata' => json_encode(['role' => $canPublish ? 'doctor' : 'patient']),
        ];

        return JWT::encode($payload, $this->apiSecret, 'HS256', $this->apiKey);
    }

    public function getWsUrl(): string
    {
        return config('livekit.ws_url', '');
    }
}
