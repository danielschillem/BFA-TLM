<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Events\NewMessage;
use App\Events\MessagesRead;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
            ->paginate(min((int) $request->input('per_page', 50), 100));

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
            'attachment'   => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt',
        ]);

        $body = $request->input('body') ?? $request->input('content');
        
        // Au moins un body ou un attachment est requis
        if (!$body && !$request->hasFile('attachment')) {
            return response()->json(['success' => false, 'message' => 'Le message ou un fichier est requis.'], 422);
        }

        $attachmentData = [];
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $path = $file->store('messages/attachments', 'private');
            $attachmentData = [
                'attachment_path' => $path,
                'attachment_name' => $file->getClientOriginalName(),
                'attachment_type' => $file->getMimeType(),
                'attachment_size' => $file->getSize(),
            ];
        }

        $message = Message::create(array_merge([
            'contenu'      => $body ?? '',
            'sender_id'    => $request->user()->id,
            'recipient_id' => $request->input('recipient_id'),
        ], $attachmentData));

        NewMessage::dispatch($message);

        return response()->json([
            'success' => true,
            'message' => 'Message envoyé',
            'data' => new MessageResource($message->load(['sender', 'recipient'])),
        ], 201);
    }

    /**
     * Marquer des messages comme lus.
     */
    public function markAsRead(Request $request): JsonResponse
    {
        $request->validate([
            'message_ids' => 'required|array',
            'message_ids.*' => 'integer|exists:messages,id',
        ]);

        $userId = $request->user()->id;
        $messageIds = $request->input('message_ids');

        // Récupérer les messages à marquer (seulement ceux destinés à l'utilisateur)
        $messages = Message::whereIn('id', $messageIds)
            ->where('recipient_id', $userId)
            ->where('lu', false)
            ->get();

        if ($messages->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Marquer comme lus
        $now = now();
        Message::whereIn('id', $messages->pluck('id'))
            ->update(['lu' => true, 'read_at' => $now]);

        // Notifier l'expéditeur (groupé par sender)
        $bySender = $messages->groupBy('sender_id');
        foreach ($bySender as $senderId => $senderMessages) {
            MessagesRead::dispatch($userId, $senderId, $senderMessages->pluck('id')->toArray());
        }

        return response()->json([
            'success' => true,
            'data' => [
                'marked_count' => $messages->count(),
                'read_at' => $now->toISOString(),
            ],
        ]);
    }

    /**
     * Rechercher dans les messages.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2|max:100',
            'with_user' => 'nullable|integer|exists:users,id',
        ]);

        $userId = $request->user()->id;
        $query = $request->input('q');
        $withUser = $request->input('with_user');

        $messages = Message::with(['sender', 'recipient'])
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            })
            ->where('contenu', 'like', "%{$query}%");

        if ($withUser) {
            $messages->where(function ($q) use ($withUser) {
                $q->where('sender_id', $withUser)->orWhere('recipient_id', $withUser);
            });
        }

        $results = $messages->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => MessageResource::collection($results),
        ]);
    }

    /**
     * Supprimer un message (soft delete pour l'utilisateur).
     */
    public function destroy(int $id, Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        
        $message = Message::where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            })
            ->firstOrFail();

        // Ne supprimer que si c'est l'expéditeur et le message est récent (< 5 min)
        if ($message->sender_id === $userId && $message->created_at->diffInMinutes(now()) <= 5) {
            // Supprimer le fichier attaché si présent
            if ($message->attachment_path) {
                Storage::disk('private')->delete($message->attachment_path);
            }
            $message->delete();
            return response()->json(['success' => true, 'message' => 'Message supprimé']);
        }

        return response()->json([
            'success' => false,
            'message' => 'Vous ne pouvez supprimer que vos propres messages récents (< 5 min).',
        ], 403);
    }

    /**
     * Télécharger un fichier attaché.
     */
    public function downloadAttachment(int $id, Request $request)
    {
        $userId = $request->user()->id;

        $message = Message::where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            })
            ->firstOrFail();

        if (!$message->attachment_path || !Storage::disk('private')->exists($message->attachment_path)) {
            return response()->json(['success' => false, 'message' => 'Fichier non trouvé'], 404);
        }

        $path = Storage::disk('private')->path($message->attachment_path);
        return response()->download($path, $message->attachment_name ?? 'attachment');
    }
}
