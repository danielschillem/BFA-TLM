<?php

namespace Tests\Unit;

use App\Support\CorsOriginResolver;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CorsConfigTest extends TestCase
{
    #[Test]
    public function it_normalizes_explicit_origins_and_merges_prod_urls(): void
    {
        $this->assertSame([
            'https://front.example.com',
            'https://www.front.example.com',
            'https://api.example.com',
        ], CorsOriginResolver::resolve(
            'https://front.example.com/ , https://www.front.example.com/ , https://front.example.com',
            'https://front.example.com/',
            'https://api.example.com/',
        ));
    }

    #[Test]
    public function it_falls_back_to_frontend_and_app_urls_when_explicit_origins_are_missing(): void
    {
        $this->assertSame([
            'https://front.example.com',
            'https://api.example.com',
        ], CorsOriginResolver::resolve(
            '',
            'https://front.example.com/',
            'https://api.example.com/',
        ));
    }

    #[Test]
    public function it_uses_local_defaults_when_no_origin_is_configured(): void
    {
        $this->assertSame([
            'http://localhost:3000',
            'http://localhost:5173',
        ], CorsOriginResolver::resolve(null, null, null));
    }

    #[Test]
    public function it_converts_wildcard_origins_to_allowed_origin_patterns(): void
    {
        $patterns = CorsOriginResolver::resolvePatterns(
            'https://*.hostingersite.com, https://front.example.com',
        );

        $this->assertCount(1, $patterns);
        $this->assertMatchesRegularExpression($patterns[0], 'https://aqua-weasel-241472.hostingersite.com');
        $this->assertDoesNotMatchRegularExpression($patterns[0], 'https://front.example.com');
    }
}
