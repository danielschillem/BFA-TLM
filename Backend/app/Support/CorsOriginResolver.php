<?php

namespace App\Support;

class CorsOriginResolver
{
    public static function resolve(?string $explicitOrigins, ?string $frontendUrl, ?string $appUrl): array
    {
        $allowedOrigins = array_values(array_unique([
            ...self::parseOrigins($explicitOrigins),
            ...array_values(array_filter([
                self::normalizeOrigin($frontendUrl),
                self::normalizeOrigin($appUrl),
            ])),
        ]));

        if ($allowedOrigins === []) {
            return ['http://localhost:3000', 'http://localhost:5173'];
        }

        return $allowedOrigins;
    }

    private static function parseOrigins(?string $origins): array
    {
        if (!is_string($origins) || trim($origins) === '') {
            return [];
        }

        return array_values(array_unique(array_filter(
            array_map([self::class, 'normalizeOrigin'], explode(',', $origins))
        )));
    }

    private static function normalizeOrigin(?string $origin): ?string
    {
        if (!is_string($origin)) {
            return null;
        }

        $origin = rtrim(trim($origin), '/');

        return $origin !== '' ? $origin : null;
    }
}
