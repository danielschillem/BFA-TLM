<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MonitoringController extends Controller
{
    public function frontendError(Request $request): JsonResponse
    {
        if (!filter_var(env('FRONTEND_ERROR_LOGGING_ENABLED', true), FILTER_VALIDATE_BOOL)) {
            return response()->json(['success' => true, 'message' => 'disabled']);
        }

        $payload = $request->validate([
            'message' => 'required|string|max:2000',
            'source' => 'nullable|string|max:500',
            'stack' => 'nullable|string|max:10000',
            'url' => 'nullable|string|max:2000',
            'userAgent' => 'nullable|string|max:1000',
        ]);

        Log::error('Frontend runtime error', [
            'frontend_error' => $payload,
            'ip' => $request->ip(),
            'user_id' => optional($request->user())->id,
        ]);

        return response()->json(['success' => true], 202);
    }

    public function visioMetric(Request $request): JsonResponse
    {
        if (!filter_var(env('FRONTEND_VISIO_METRICS_ENABLED', true), FILTER_VALIDATE_BOOL)) {
            return response()->json(['success' => true, 'message' => 'disabled']);
        }

        $payload = $request->validate([
            'metric' => 'required|string|in:join_fail,reconnect_count,fallback_rate,session_quality_score,session_summary',
            'data' => 'nullable|array',
            'url' => 'nullable|string|max:2000',
            'userAgent' => 'nullable|string|max:1000',
            'timestamp' => 'nullable|string|max:100',
        ]);

        Log::info('Visio session metric', [
            'visio_metric' => $payload,
            'ip' => $request->ip(),
            'user_id' => optional($request->user())->id,
        ]);

        return response()->json(['success' => true], 202);
    }
}
