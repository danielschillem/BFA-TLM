import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquare, Search, Send, ChevronLeft } from 'lucide-react'
import { messagesApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import { getInitials, formatDateLabel } from '@/utils/helpers'
import Conversation from './Conversation'

export default function MessageInbox() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['messages', 'inbox'],
    queryFn: () => messagesApi.inbox().then(r => {
      const payload = r.data?.data

      if (Array.isArray(payload)) return payload

      const rows = payload?.data ?? []
      return rows.map(item => {
        const otherUser = item.other_user
          ?? (item.sender_id === user?.id ? item.recipient : item.sender)
          ?? null

        return {
          id: otherUser?.id ?? item.id,
          other_user: otherUser,
          unread_count: item.unread_count ?? 0,
          last_message_at: item.last_message_at ?? item.created_at,
          last_message: item.last_message ?? { body: item.body, content: item.content },
        }
      })
    }),
    refetchInterval: 15_000,
  })

  const threads = (data ?? []).filter(t => {
    const other = t.other_user
    if (!search) return true
    const fallbackName = other?.full_name ?? other?.name ?? ''
    const composedName = `${other?.first_name ?? ''} ${other?.last_name ?? ''}`.trim()
    const name = (composedName || fallbackName).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  if (conversationId) {
    return (
      <AppLayout title="Messages">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/messages')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ChevronLeft className="w-4 h-4" /> Boîte de réception
          </button>
          <Conversation conversationId={conversationId} />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Messages">
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Chercher une conversation…"
            className="input-field pl-9 w-full"
          />
        </div>

        {/* Threads */}
        {isLoading ? <LoadingPage /> : threads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucun message"
            description="Vos conversations apparaîtront ici."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {threads.map(thread => {
              const other = thread.other_user
              const displayName = `${other?.first_name ?? ''} ${other?.last_name ?? ''}`.trim() || other?.full_name || other?.name || 'Utilisateur'
              const initials = getInitials(displayName)
              const isUnread = thread.unread_count > 0
              return (
                <button
                  key={thread.id}
                  onClick={() => navigate(`/messages/${thread.id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold ${
                      isUnread ? 'bg-primary-500' : 'bg-gray-400'
                    }`}>
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
                      <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {displayName}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDateLabel(thread.last_message_at)}</span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${isUnread ? 'text-gray-700' : 'text-gray-400'}`}>
                      {thread.last_message?.body ?? thread.last_message?.content ?? 'Aucun message'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
