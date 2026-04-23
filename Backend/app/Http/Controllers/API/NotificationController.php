<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'unread_only' => 'nullable|boolean',
        ]);

        $query = $request->user()->notifications();
        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $notifications = $query
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json([
            'success' => true,
            'data' => $notifications->items(),
            'meta' => [
                'unread_count' => $request->user()->unreadNotifications()->count(),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'total' => $notifications->total(),
                ],
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $request->user()->unreadNotifications()->count(),
            ],
        ]);
    }

    public function markAsRead(string $notificationId, Request $request): JsonResponse
    {
        if (!\Illuminate\Support\Str::isUuid($notificationId)) {
            return response()->json([
                'success' => false,
                'message' => 'Identifiant de notification invalide.',
            ], 422);
        }

        $notification = $request->user()
            ->notifications()
            ->where('id', $notificationId)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marquée comme lue',
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $marked = $request->user()
            ->unreadNotifications()
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Toutes les notifications marquées comme lues',
            'data' => ['marked_count' => $marked],
        ]);
    }
}
