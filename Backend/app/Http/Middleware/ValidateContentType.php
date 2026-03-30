<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateContentType
{
    /**
     * Rejette les requêtes POST/PUT/PATCH qui ne sont pas en JSON
     * (sauf multipart/form-data pour les uploads de fichiers).
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $contentType = $request->header('Content-Type', '');

            $isJson      = str_contains($contentType, 'application/json');
            $isMultipart = str_contains($contentType, 'multipart/form-data');
            $isForm      = str_contains($contentType, 'application/x-www-form-urlencoded');

            if (!$isJson && !$isMultipart && !$isForm) {
                return response()->json([
                    'success' => false,
                    'message' => 'Content-Type non supporté. Utilisez application/json ou multipart/form-data.',
                    'error'   => 'unsupported_content_type',
                ], 415);
            }
        }

        return $next($request);
    }
}
