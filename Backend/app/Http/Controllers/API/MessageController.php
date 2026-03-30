<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Events\NewMessage;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function inbox(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        // Récupérer les derniers messages par conversation
        $messages = Message::with(['sender', 'recipient'])
            ->where('recipient_id', $userId)
            ->orWhere('sender_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy(function ($msg) use ($userId) {
                return $msg->sender_id === $userId ? $msg->recipient_id : $msg->sender_id;
            });

        // Construire les threads pour le frontend
        $threads = $messages->map(function ($group) use ($userId) {
            $latest = $group->first();
            $otherUser = $latest->sender_id === $userId ? $latest->recipient : $latest->sender;
            $unread = $group->where('recipient_id', $userId)->where('lu', false)->count();

            return [
                'id'              => $otherUser?->id ?? $latest->id,
                'other_user'      => $otherUser ? (new UserResource($otherUser))->resolve() : null,
                'unread_count'    => $unread,
                'last_message_at' => $latest->created_at?->toISOString(),
                'last_message'    => [
                    'body'    => $latest->contenu,
                    'content' => $latest->contenu,
                ],
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $threads,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Message::where('recipient_id', $request->user()->id)
            ->where('lu', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => ['count' => $count],
        ]);
    }

    public function conversation(int $userId, Request $request): JsonResponse
    {
        $authId = $request->user()->id;

        $messages = Message::with(['sender', 'recipient'])
            ->where(function ($q) use ($authId, $userId) {
                $q->where('sender_id', $authId)->where('recipient_id', $userId);
            })
            ->orWhere(function ($q) use ($authId, $userId) {
                $q->where('sender_id', $userId)->where('recipient_id', $authId);
            })
            ->orderBy('created_at', 'asc')
            ->paginate($request->input('per_page', 50));

        // Marquer comme lus
        Message::where('sender_id', $userId)
            ->where('recipient_id', $authId)
            ->where('lu', false)
            ->update(['lu' => true]);

        return response()->json([
            'success' => true,
            'data' => MessageResource::collection($messages),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'body'         => 'nullable|string|max:5000',
            'content'      => 'nullable|string|max:5000',
        ]);

        $body = $request->input('body') ?? $request->input('content');
        if (!$body) {
            return response()->json(['success' => false, 'message' => 'Le message est requis.'], 422);
        }

        $message = Message::create([
            'contenu'      => $body,
            'sender_id'    => $request->user()->id,
            'recipient_id' => $request->input('recipient_id'),
        ]);

        NewMessage::dispatch($message);

        return response()->json([
            'success' => true,
            'message' => 'Message envoyé',
            'data' => new MessageResource($message->load(['sender', 'recipient'])),
        ], 201);
    }
}
