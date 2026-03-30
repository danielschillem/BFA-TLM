import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { messagesApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import Button from '@/components/ui/Button'
import { formatDateTime } from '@/utils/helpers'

export default function Conversation({ conversationId }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const bottomRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['messages', 'conversation', conversationId],
    queryFn: () => messagesApi.conversation(conversationId).then(r => {
      const payload = r.data?.data

      if (Array.isArray(payload)) {
        return { messages: payload, other_user: null }
      }

      if (Array.isArray(payload?.messages)) {
        return payload
      }

      const rows = payload?.data ?? []
      const first = rows[0]
      const fallbackOther = first
        ? (first.sender_id === user?.id ? first.recipient : first.sender)
        : null

      return {
        messages: rows,
        other_user: payload?.other_user ?? fallbackOther ?? null,
      }
    }),
    refetchInterval: 8_000,
  })

  const sendMutation = useMutation({
    mutationFn: () => messagesApi.send(conversationId, { body }),
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] })
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  })

  // Scroll to bottom when new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages?.length])

  if (isLoading) return <LoadingPage />

  const messages = data?.messages ?? []
  const other    = data?.other_user
  const displayName = `${other?.first_name ?? ''} ${other?.last_name ?? ''}`.trim() || other?.full_name || other?.name || 'Conversation'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold">
          {(displayName.split(' ')[0]?.[0] ?? '') + (displayName.split(' ')[1]?.[0] ?? '')}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
          {other?.specialty && (
            <p className="text-xs text-primary-600">{other.specialty}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Commencez la conversation !</p>
        )}
        {messages.map(msg => {
          const isMe = msg.is_mine ?? msg.sender_id === user?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMe
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.body ?? msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                  {formatDateTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex-shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); if (body.trim()) sendMutation.mutate() }}
          className="flex items-end gap-2"
        >
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (body.trim()) sendMutation.mutate()
              }
            }}
            placeholder="Écrivez un message…"
            rows={1}
            className="input-field flex-1 resize-none min-h-[2.5rem] max-h-32"
            style={{ height: Math.min(32 + (body.split('\n').length - 1) * 20, 128) + 'px' }}
          />
          <Button
            type="submit"
            loading={sendMutation.isPending}
            disabled={!body.trim()}
            icon={Send}
            size="sm"
            className="flex-shrink-0 h-10 w-10 p-0 flex items-center justify-center"
          >
            <span className="sr-only">Envoyer</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
