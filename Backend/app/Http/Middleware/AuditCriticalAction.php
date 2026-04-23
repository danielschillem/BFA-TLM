<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AuditCriticalAction
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();
        $route = $request->route();
        $path = trim($request->path(), '/');

        $action = $this->resolveAction($path, $request->method());
        if ($action === null) {
            return $response;
        }

        Log::channel(config('logging.default'))->info('Critical action audit', [
            'action' => $action,
            'method' => $request->method(),
            'path' => $request->path(),
            'status_code' => $response->getStatusCode(),
            'user_id' => $user?->id,
            'roles' => $user?->getRoleNames()?->values()?->all() ?? [],
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'route_params' => $route?->parameters() ?? [],
        ]);

        return $response;
    }

    private function resolveAction(string $path, string $method): ?string
    {
        if (str_contains($path, '/patients/') && str_contains($path, '/record')) {
            return $method === 'GET' ? 'patient.record.read' : 'patient.record.update';
        }

        if (str_contains($path, '/prescriptions')) {
            return match ($method) {
                'POST' => 'prescription.write',
                'GET' => 'prescription.read',
                default => 'prescription.action',
            };
        }

        if (str_contains($path, '/payments')) {
            return match ($method) {
                'GET' => 'payment.read',
                'POST' => 'payment.write',
                default => 'payment.action',
            };
        }

        return null;
    }
}
