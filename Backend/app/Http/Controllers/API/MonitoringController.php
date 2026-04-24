<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

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
            'consultation_id' => 'nullable|integer|min:1',
            'url' => 'nullable|string|max:2000',
            'userAgent' => 'nullable|string|max:1000',
            'timestamp' => 'nullable|string|max:100',
        ]);

        if (Schema::hasTable('visio_metrics')) {
            DB::table('visio_metrics')->insert([
                'metric' => $payload['metric'],
                'consultation_id' => $payload['consultation_id'] ?? ($payload['data']['consultation_id'] ?? null),
                'user_id' => optional($request->user())->id,
                'data' => json_encode($payload['data'] ?? []),
                'url' => $payload['url'] ?? null,
                'user_agent' => $payload['userAgent'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Log::info('Visio session metric', [
            'visio_metric' => $payload,
            'ip' => $request->ip(),
            'user_id' => optional($request->user())->id,
        ]);

        return response()->json(['success' => true], 202);
    }

    public function visioMetricsSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'nullable|string|in:24h,7d',
        ]);

        $period = $validated['period'] ?? '24h';
        $windowStart = $period === '7d' ? now()->subDays(7) : now()->subDay();

        if (!Schema::hasTable('visio_metrics')) {
            return response()->json([
                'success' => true,
                'data' => $this->emptySummary($period, $windowStart),
            ]);
        }

        $summary = [
            'period' => $period,
            'window_start' => $windowStart->toIso8601String(),
            'window_end' => now()->toIso8601String(),
            'samples_count' => 0,
            'join_fail_count' => 0,
            'reconnect_events' => 0,
            'fallback_events' => 0,
            'fallback_rate_percent_avg' => 0,
            'session_quality_score_avg' => 0,
            'trend' => [],
        ];

        $fallbackRates = [];
        $qualityScores = [];
        $maxReconnectCountByConsultation = [];
        $trendBuckets = [];

        $rows = DB::table('visio_metrics')
            ->where('created_at', '>=', $windowStart)
            ->orderBy('created_at')
            ->get(['metric', 'consultation_id', 'data', 'created_at']);

        foreach ($rows as $row) {
            $loggedAt = Carbon::parse((string) $row->created_at);
            $metric = (string) $row->metric;
            $data = is_string($row->data) ? json_decode($row->data, true) : (array) $row->data;
            if (!is_array($data)) {
                $data = [];
            }

            $summary['samples_count']++;

            if ($metric === 'join_fail') {
                $summary['join_fail_count']++;
            }

            if ($metric === 'reconnect_count') {
                $consultationId = (string) ($row->consultation_id ?? ($data['consultation_id'] ?? 'global'));
                $reconnectCount = (int) ($data['reconnect_count'] ?? 0);
                if (
                    !isset($maxReconnectCountByConsultation[$consultationId]) ||
                    $reconnectCount > $maxReconnectCountByConsultation[$consultationId]
                ) {
                    $maxReconnectCountByConsultation[$consultationId] = $reconnectCount;
                }
            }

            if ($metric === 'fallback_rate') {
                $summary['fallback_events']++;
                $fallbackRates[] = (float) ($data['fallback_rate_percent'] ?? 0);
            }

            if ($metric === 'session_quality_score' || $metric === 'session_summary') {
                $qualityScore = (float) ($data['session_quality_score'] ?? 0);
                if ($qualityScore > 0) {
                    $qualityScores[] = $qualityScore;
                }
            }

            $bucket = $period === '7d' ? $loggedAt->format('Y-m-d') : $loggedAt->format('Y-m-d H:00');
            if (!isset($trendBuckets[$bucket])) {
                $trendBuckets[$bucket] = [
                    'label' => $period === '7d' ? $loggedAt->format('d/m') : $loggedAt->format('H:i'),
                    'join_fail_count' => 0,
                    'reconnect_events' => 0,
                    'quality_scores' => [],
                ];
            }
            if ($metric === 'join_fail') {
                $trendBuckets[$bucket]['join_fail_count']++;
            }
            if ($metric === 'reconnect_count') {
                $trendBuckets[$bucket]['reconnect_events'] = max(
                    $trendBuckets[$bucket]['reconnect_events'],
                    (int) ($data['reconnect_count'] ?? 0)
                );
            }
            if (($metric === 'session_quality_score' || $metric === 'session_summary') && isset($qualityScore) && $qualityScore > 0) {
                $trendBuckets[$bucket]['quality_scores'][] = $qualityScore;
            }
        }

        $summary['reconnect_events'] = array_sum($maxReconnectCountByConsultation);
        $summary['fallback_rate_percent_avg'] = $this->roundAverage($fallbackRates);
        $summary['session_quality_score_avg'] = $this->roundAverage($qualityScores);
        $summary['trend'] = collect($trendBuckets)
            ->sortKeys()
            ->map(function (array $bucketData) {
                return [
                    'label' => $bucketData['label'],
                    'join_fail_count' => $bucketData['join_fail_count'],
                    'reconnect_events' => $bucketData['reconnect_events'],
                    'session_quality_score' => $this->roundAverage($bucketData['quality_scores']),
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    private function roundAverage(array $values): float
    {
        if ($values === []) {
            return 0;
        }

        return round(array_sum($values) / count($values), 2);
    }

    private function emptySummary(string $period, Carbon $windowStart): array
    {
        return [
            'period' => $period,
            'window_start' => $windowStart->toIso8601String(),
            'window_end' => now()->toIso8601String(),
            'samples_count' => 0,
            'join_fail_count' => 0,
            'reconnect_events' => 0,
            'fallback_events' => 0,
            'fallback_rate_percent_avg' => 0,
            'session_quality_score_avg' => 0,
            'trend' => [],
        ];
    }
}
