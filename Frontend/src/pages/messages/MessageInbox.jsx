import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  MessageSquare,
  Search,
  Send,
  ChevronLeft,
  X,
  FileText,
  ArrowRight,
} from "lucide-react";
import { messagesApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import { getInitials, formatDateLabel, formatDateTime } from "@/utils/helpers";
import Conversation from "./Conversation";

export default function MessageInbox() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState("conversations"); // 'conversations' | 'messages'
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search for message content search
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Query: inbox threads
  const { data, isLoading } = useQuery({
    queryKey: ["messages", "inbox"],
    queryFn: () =>
      messagesApi.inbox().then((r) => {
        const payload = r.data?.data;

        if (Array.isArray(payload)) return payload;

        const rows = payload?.data ?? [];
        return rows.map((item) => {
          const otherUser =
            item.other_user ??
            (item.sender_id === user?.id ? item.recipient : item.sender) ??
            null;

          return {
            id: otherUser?.id ?? item.id,
            other_user: otherUser,
            unread_count: item.unread_count ?? 0,
            last_message_at: item.last_message_at ?? item.created_at,
            last_message: item.last_message ?? {
              body: item.body,
              content: item.content,
            },
          };
        });
      }),
    refetchInterval: 15_000,
  });

  // Query: message content search
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["messages", "search", debouncedSearch],
    queryFn: () =>
      messagesApi.search(debouncedSearch).then((r) => r.data?.data ?? []),
    enabled: searchMode === "messages" && debouncedSearch.length >= 2,
  });

  const threads = (data ?? []).filter((t) => {
    const other = t.other_user;
    if (!search || searchMode === "messages") return true;
    const fallbackName = other?.full_name ?? other?.name ?? "";
    const composedName =
      `${other?.first_name ?? ""} ${other?.last_name ?? ""}`.trim();
    const name = (composedName || fallbackName).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (conversationId) {
    return (
      <AppLayout title="Messages">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/messages")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Boîte de réception
          </button>
          <Conversation conversationId={conversationId} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Messages">
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        {/* Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                searchMode === "conversations"
                  ? "Chercher une conversation…"
                  : "Rechercher dans les messages…"
              }
              className="input-field pl-9 pr-9 w-full"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setSearchMode("conversations");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle search mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setSearchMode("conversations")}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                searchMode === "conversations"
                  ? "bg-primary-100 text-primary-700 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Par contact
            </button>
            <button
              onClick={() => setSearchMode("messages")}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                searchMode === "messages"
                  ? "bg-primary-100 text-primary-700 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Dans les messages
            </button>
          </div>
        </div>

        {/* Search Results (message content) */}
        {searchMode === "messages" && debouncedSearch.length >= 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500">
                Résultats de recherche
                {searchResults?.length ? ` (${searchResults.length})` : ""}
              </p>
            </div>
            {isSearching ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Recherche...
              </div>
            ) : !searchResults?.length ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Aucun résultat
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {searchResults.map((msg) => {
                  const other =
                    msg.sender_id === user?.id ? msg.recipient : msg.sender;
                  const displayName =
                    `${other?.first_name ?? ""} ${other?.last_name ?? ""}`.trim() ||
                    other?.name ||
                    "Utilisateur";
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setSearch("");
                        setSearchMode("conversations");
                        navigate(`/messages/${other?.id}`);
                      }}
                      className="w-full p-3 hover:bg-gray-50 text-left flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(displayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">
                            {isMe ? (
                              <>
                                <span>Vous</span>{" "}
                                <ArrowRight className="w-3 h-3 inline" />{" "}
                              </>
                            ) : (
                              ""
                            )}
                            {displayName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDateTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                          {msg.body ?? msg.content}
                        </p>
                        {msg.has_attachment && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary-600 mt-1">
                            <FileText className="w-3 h-3" /> Pièce jointe
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Threads */}
        {isLoading ? (
          <LoadingPage />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucun message"
            description="Vos conversations apparaîtront ici."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {threads.map((thread) => {
              const other = thread.other_user;
              const displayName =
                `${other?.first_name ?? ""} ${other?.last_name ?? ""}`.trim() ||
                other?.full_name ||
                other?.name ||
                "Utilisateur";
              const initials = getInitials(displayName);
              const isUnread = thread.unread_count > 0;
              return (
                <button
                  key={thread.id}
                  onClick={() => navigate(`/messages/${thread.id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold ${
                        isUnread ? "bg-primary-500" : "bg-gray-400"
                      }`}
                    >
                      {initials}
                    </div>
                    {isUnread && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`text-sm truncate ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}
                      >
                        {displayName}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDateLabel(thread.last_message_at)}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 truncate ${isUnread ? "text-gray-700" : "text-gray-400"}`}
                    >
                      {thread.last_message?.body ??
                        thread.last_message?.content ??
                        "Aucun message"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
