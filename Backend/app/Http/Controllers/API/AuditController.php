<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class AuditController extends Controller
{
    private function formatLog(Activity $log): array
    {
        $props = $log->properties ?? collect();

        return [
            'id'              => $log->id,
            'event'           => $log->event,
            'description'     => $log->description,
            'method'          => $props['method'] ?? strtoupper($log->event ?? 'GET'),
            'url'             => $props['url'] ?? $log->subject_type,
            'response_status' => $props['response_status'] ?? ($log->event === 'deleted' ? 200 : 200),
            'ip_address'      => $props['ip'] ?? $props['ip_address'] ?? null,
            'user_agent'      => $props['user_agent'] ?? null,
            'user'            => $log->causer ? [
                'id'         => $log->causer->id,
                'first_name' => $log->causer->prenoms,
                'last_name'  => $log->causer->nom,
                'email'      => $log->causer->email,
            ] : null,
            'subject_type'    => $log->subject_type,
            'subject_id'      => $log->subject_id,
            'changes'         => [
                'old' => $props['old'] ?? null,
                'attributes' => $props['attributes'] ?? null,
            ],
            'created_at'      => $log->created_at?->toISOString(),
        ];
    }

    public function myLogs(Request $request): JsonResponse
    {
        $logs = Activity::where('causer_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => [
                'data' => collect($logs->items())->map(fn ($l) => $this->formatLog($l)),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page'    => $logs->lastPage(),
                    'per_page'     => $logs->perPage(),
                    'total'        => $logs->total(),
                ],
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Activity::with('causer')
            ->orderBy('created_at', 'desc');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('subject_type', 'like', "%{$search}%")
                  ->orWhereHas('causer', function ($cq) use ($search) {
                      $cq->where('nom', 'like', "%{$search}%")
                         ->orWhere('prenoms', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        if ($type = $request->input('type')) {
            $query->where('subject_type', 'like', "%{$type}%");
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $logs = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => [
                'data' => collect($logs->items())->map(fn ($l) => $this->formatLog($l)),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page'    => $logs->lastPage(),
                    'per_page'     => $logs->perPage(),
                    'total'        => $logs->total(),
                ],
            ],
        ]);
    }

    public function report(Request $request): JsonResponse
    {
        $from = $request->input('date_from', $request->input('from', now()->subMonth()->toDateString()));
        $to   = $request->input('date_to', $request->input('to', now()->toDateString()));

        $stats = Activity::whereBetween('created_at', [$from, $to])
            ->selectRaw('event, COUNT(*) as count')
            ->groupBy('event')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'period' => ['from' => $from, 'to' => $to],
                'events' => $stats,
                'total'  => $stats->sum('count'),
            ],
        ]);
    }
}
