import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Image,
  Download,
  Check,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { messagesApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import { useChatChannel } from "@/hooks/useWebSocket";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/utils/helpers";

// Taille max du fichier (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export default function Conversation({ conversationId }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const readTimeoutRef = useRef(null);

  // --- WebSocket temps réel ---
  const handleNewMessage = useCallback(
    (data) => {
      // Si le message vient de l'autre personne, marquer comme lu après un court délai
      if (data.sender_id !== user?.id) {
        clearTimeout(readTimeoutRef.current);
        readTimeoutRef.current = setTimeout(() => {
          messagesApi.markAsRead([data.id]).catch(() => {});
        }, 1000);
      }
    },
    [user?.id],
  );

  const handleTyping = useCallback(
    (data) => {
      if (data.user_id !== user?.id) {
        setOtherTyping(data.is_typing);
        // Auto-reset après 3s si pas de mise à jour
        if (data.is_typing) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(
            () => setOtherTyping(false),
            3000,
          );
        }
      }
    },
    [user?.id],
  );

  const handleRead = useCallback(() => {
    // Refetch pour mettre à jour les status de lecture
    queryClient.invalidateQueries({
      queryKey: ["messages", "conversation", conversationId],
    });
  }, [queryClient, conversationId]);

  const { sendTyping } = useChatChannel(conversationId, {
    onMessage: handleNewMessage,
    onTyping: handleTyping,
    onRead: handleRead,
  });

  // --- Query ---
  const { data, isLoading } = useQuery({
    queryKey: ["messages", "conversation", conversationId],
    queryFn: () =>
      messagesApi.conversation(conversationId).then((r) => {
        const payload = r.data?.data;

        if (Array.isArray(payload)) {
          return { messages: payload, other_user: null };
        }

        if (Array.isArray(payload?.messages)) {
          return payload;
        }

        const rows = payload?.data ?? [];
        const first = rows[0];
        const fallbackOther = first
          ? first.sender_id === user?.id
            ? first.recipient
            : first.sender
          : null;

        return {
          messages: rows,
          other_user: payload?.other_user ?? fallbackOther ?? null,
        };
      }),
    refetchInterval: 30_000, // Réduit car on a WebSocket temps réel
  });

  // Marquer les messages non lus comme lus au chargement
  useEffect(() => {
    const messages = data?.messages ?? [];
    const unreadIds = messages
      .filter((m) => m.sender_id !== user?.id && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      messagesApi.markAsRead(unreadIds).catch(() => {});
    }
  }, [data?.messages, user?.id]);

  // --- Mutations ---
  const sendMutation = useMutation({
    mutationFn: () => {
      if (attachment) {
        return messagesApi.sendWithAttachment(conversationId, body, attachment);
      }
      return messagesApi.send(conversationId, { body });
    },
    onSuccess: () => {
      setBody("");
      setAttachment(null);
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversation", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  // --- Gestion frappe ---
  const handleBodyChange = (e) => {
    setBody(e.target.value);

    // Envoyer indicateur de frappe
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }

    // Reset après 2s sans frappe
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 2000);
  };

  // --- Gestion fichier ---
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Le fichier est trop volumineux (max 10 MB)");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Type de fichier non autorisé");
      return;
    }

    setAttachment(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Scroll automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(readTimeoutRef.current);
    };
  }, []);

  if (isLoading) return <LoadingPage />;

  const messages = data?.messages ?? [];
  const other = data?.other_user;
  const displayName =
    `${other?.first_name ?? ""} ${other?.last_name ?? ""}`.trim() ||
    other?.full_name ||
    other?.name ||
    "Conversation";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (body.trim() || attachment) {
      sendMutation.mutate();
    }
  };

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 flex flex-col"
      style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold">
          {(displayName.split(" ")[0]?.[0] ?? "") +
            (displayName.split(" ")[1]?.[0] ?? "")}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
          {other?.specialty && (
            <p className="text-xs text-primary-600">{other.specialty}</p>
          )}
          {otherTyping && (
            <p className="text-xs text-gray-500 animate-pulse">écrit...</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Commencez la conversation !
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.is_mine ?? msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? "bg-primary-500 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {/* Contenu texte */}
                {(msg.body ?? msg.content) && (
                  <p className="text-sm leading-relaxed">
                    {msg.body ?? msg.content}
                  </p>
                )}

                {/* Pièce jointe */}
                {msg.has_attachment && msg.attachment && (
                  <MessageAttachment
                    attachment={msg.attachment}
                    messageId={msg.id}
                    isMe={isMe}
                  />
                )}

                {/* Footer: heure + status lu */}
                <div
                  className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}
                >
                  <span
                    className={`text-[10px] ${isMe ? "text-primary-200" : "text-gray-400"}`}
                  >
                    {formatDateTime(msg.created_at)}
                  </span>
                  {isMe && (
                    <span
                      className={`${msg.read || msg.read_at ? "text-blue-300" : "text-primary-200"}`}
                    >
                      {msg.read || msg.read_at ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex-shrink-0">
        {/* Preview pièce jointe */}
        {attachment && (
          <div className="mb-2 p-2 bg-gray-50 rounded-lg flex items-center gap-2">
            {attachment.type.startsWith("image/") ? (
              <Image className="w-5 h-5 text-primary-500" />
            ) : (
              <FileText className="w-5 h-5 text-primary-500" />
            )}
            <span className="text-sm text-gray-700 flex-1 truncate">
              {attachment.name}
            </span>
            <span className="text-xs text-gray-400">
              {(attachment.size / 1024).toFixed(0)} KB
            </span>
            <button
              onClick={removeAttachment}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          {/* Bouton fichier */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 h-10 w-10 p-0 flex items-center justify-center text-gray-500 hover:text-primary-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            value={body}
            onChange={handleBodyChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (body.trim() || attachment) sendMutation.mutate();
              }
            }}
            placeholder="Écrivez un message…"
            rows={1}
            className="input-field flex-1 resize-none min-h-[2.5rem] max-h-32"
            style={{
              height:
                Math.min(32 + (body.split("\n").length - 1) * 20, 128) + "px",
            }}
          />
          <Button
            type="submit"
            loading={sendMutation.isPending}
            disabled={!body.trim() && !attachment}
            icon={Send}
            size="sm"
            className="flex-shrink-0 h-10 w-10 p-0 flex items-center justify-center"
          >
            <span className="sr-only">Envoyer</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

// Composant pour afficher les pièces jointes
function MessageAttachment({ attachment, messageId, isMe }) {
  const isImage = attachment.type?.startsWith("image/");
  const baseUrl = import.meta.env.VITE_API_URL || "";
  const downloadUrl = `${baseUrl}${messagesApi.attachmentUrl(messageId)}`;

  if (isImage) {
    return (
      <div className="mt-2">
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={downloadUrl}
            alt={attachment.name}
            className="max-w-full rounded-lg max-h-48 object-cover"
          />
        </a>
      </div>
    );
  }

  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex items-center gap-2 p-2 rounded-lg ${
        isMe
          ? "bg-primary-600 hover:bg-primary-700"
          : "bg-gray-200 hover:bg-gray-300"
      } transition-colors`}
    >
      <FileText className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className={`text-xs ${isMe ? "text-primary-200" : "text-gray-500"}`}>
          {(attachment.size / 1024).toFixed(0)} KB
        </p>
      </div>
      <Download className="w-4 h-4 flex-shrink-0" />
    </a>
  );
}
