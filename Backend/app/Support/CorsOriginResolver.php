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

    public static function resolvePatterns(?string $explicitOrigins, ?string $explicitPatterns = null): array
    {
        return array_values(array_unique([
            ...self::parseWildcardOrigins($explicitOrigins),
            ...self::parsePatterns($explicitPatterns),
        ]));
    }

    private static function parseOrigins(?string $origins): array
    {
        return self::mapEntries($origins, function (string $origin): ?string {
            $normalizedOrigin = self::normalizeOrigin($origin);

            if ($normalizedOrigin === null || str_contains($normalizedOrigin, '*')) {
                return null;
            }

            return $normalizedOrigin;
        });
    }

    private static function parseWildcardOrigins(?string $origins): array
    {
        return self::mapEntries($origins, function (string $origin): ?string {
            $normalizedOrigin = self::normalizeOrigin($origin);

            if ($normalizedOrigin === null || !str_contains($normalizedOrigin, '*')) {
                return null;
            }

            return '#^'.str_replace('\*', '[^/]+', preg_quote($normalizedOrigin, '#')).'$#';
        });
    }

    private static function parsePatterns(?string $patterns): array
    {
        return self::mapEntries($patterns, fn (string $pattern): ?string => trim($pattern) !== '' ? trim($pattern) : null);
    }

    private static function mapEntries(?string $entries, callable $mapper): array
    {
        if (!is_string($entries) || trim($entries) === '') {
            return [];
        }

        $parts = preg_split('/[\r\n,]+/', $entries) ?: [];

        return array_values(array_unique(array_filter(
            array_map($mapper, $parts)
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
