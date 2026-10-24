import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { SafetyOverflowMenu } from '../safety/SafetyOverflowMenu.tsx'
import { ErrorState } from '../states/ErrorState.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import {
  fetchRecipientQuietStatus,
  fetchSharedCreationPreview,
  fetchThreadMessages,
  markConversationRead,
  sendMessage,
  setConversationMuted,
} from '../../lib/messages/api.ts'
import { groupMessagesByDay } from '../../lib/messages/grouping.ts'
import { shouldShowConsiderateModal } from '../../lib/messages/quietPrompt.ts'
import type { ConversationSummary, QuietStatus, SharedCreationPreview, ThreadMessage } from '../../lib/messages/types.ts'
import { useMessages } from '../../lib/messages/useMessages.ts'
import { ConsiderateSendingModal } from './ConsiderateSendingModal.tsx'
import { MessageBubble } from './MessageBubble.tsx'
import { MessageComposer } from './MessageComposer.tsx'

type ConversationThreadProps = {
  conversation: ConversationSummary | null
  conversationId: string
  showBackLink?: boolean
  sharedCreationId?: string | null
  onSent?: () => void
}

type OutboundPayload = { body: string; deliverAt: string | null; sharedCreationId: string | null; clientId?: string }

export function ConversationThread({
  conversation,
  conversationId,
  showBackLink = false,
  sharedCreationId: sharedCreationIdFromUrl = null,
  onSent,
}: ConversationThreadProps) {
  const { user, profile } = useAuth()
  const { refresh, refreshUnread, patchConversation } = useMessages()
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendBusy, setSendBusy] = useState(false)
  const [quietStatus, setQuietStatus] = useState<QuietStatus | null>(null)
  const [considerateOpen, setConsiderateOpen] = useState(false)
  const [pendingSend, setPendingSend] = useState<OutboundPayload | null>(null)
  const [sharedPreviews, setSharedPreviews] = useState<Record<string, SharedCreationPreview>>({})
  const [composerShareId, setComposerShareId] = useState<string | null>(sharedCreationIdFromUrl)
  const [composerShareLabel, setComposerShareLabel] = useState<string | null>(null)
  const [retryPayloads, setRetryPayloads] = useState<Record<string, OutboundPayload>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  const other = conversation

  useEffect(() => {
    if (sharedCreationIdFromUrl) {
      setComposerShareId(sharedCreationIdFromUrl)
    }
  }, [sharedCreationIdFromUrl])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchThreadMessages(conversationId)
    setLoading(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setMessages(result.data)
    await markConversationRead(conversationId)
    patchConversation(conversationId, { unreadCount: 0 })
    await refreshUnread()
  }, [conversationId, patchConversation, refreshUnread])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!other) return
    void fetchRecipientQuietStatus(other.otherUserId).then((result) => {
      if (result.ok) setQuietStatus(result.data)
    })
  }, [other?.otherUserId])

  useEffect(() => {
    const ids = [...new Set(messages.map((m) => m.sharedCreationId).filter(Boolean))] as string[]
    for (const id of ids) {
      if (sharedPreviews[id]) continue
      void fetchSharedCreationPreview(id).then((result) => {
        if (result.ok && result.data) {
          setSharedPreviews((prev) => ({ ...prev, [id]: result.data! }))
        }
      })
    }
  }, [messages, sharedPreviews])

  useEffect(() => {
    if (composerShareId && !composerShareLabel) {
      void fetchSharedCreationPreview(composerShareId).then((result) => {
        if (result.ok && result.data) {
          const label = result.data.title?.trim() || result.data.caption?.trim() || 'Shared post'
          setComposerShareLabel(label)
        }
      })
    }
  }, [composerShareId, composerShareLabel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const groups = useMemo(() => groupMessagesByDay(messages), [messages])

  function appendOptimistic(payload: OutboundPayload): string {
    const clientId = payload.clientId ?? `local-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: ThreadMessage = {
      id: clientId,
      clientId,
      conversationId,
      senderId: user?.id ?? '',
      body: payload.body,
      sharedCreationId: payload.sharedCreationId,
      deliverAt: payload.deliverAt ?? now,
      createdAt: now,
      deletedAt: null,
      isDeleted: false,
      isScheduled: Boolean(payload.deliverAt && payload.deliverAt > now),
      localStatus: 'sending',
    }
    setMessages((prev) => [...prev, optimistic])
    setRetryPayloads((prev) => ({ ...prev, [clientId]: { ...payload, clientId } }))
    return clientId
  }

  function markOptimisticFailed(clientId: string) {
    setMessages((prev) =>
      prev.map((row) => (row.clientId === clientId ? { ...row, localStatus: 'failed' as const } : row)),
    )
  }

  function removeOptimistic(clientId: string) {
    setMessages((prev) => prev.filter((row) => row.clientId !== clientId))
    setRetryPayloads((prev) => {
      const next = { ...prev }
      delete next[clientId]
      return next
    })
  }

  async function performSend(payload: OutboundPayload, options?: { skipOptimistic?: boolean }) {
    const clientId = options?.skipOptimistic ? payload.clientId : appendOptimistic(payload)
    setSendBusy(true)
    const result = await sendMessage({
      conversationId,
      body: payload.body,
      deliverAt: payload.deliverAt,
      sharedCreationId: payload.sharedCreationId,
    })
    setSendBusy(false)
    if (!result.ok) {
      if (clientId) markOptimisticFailed(clientId)
      return
    }
    if (clientId) removeOptimistic(clientId)
    setConsiderateOpen(false)
    setPendingSend(null)
    setComposerShareId(null)
    setComposerShareLabel(null)
    await load()
    await refresh()
    onSent?.()
  }

  function requestSend(payload: { body: string; deliverAt: string | null; sharedCreationId: string | null }) {
    if (shouldShowConsiderateModal(quietStatus) && !payload.deliverAt) {
      setPendingSend(payload)
      setConsiderateOpen(true)
      return
    }
    void performSend(payload)
  }

  function retrySend(clientId: string) {
    const payload = retryPayloads[clientId]
    if (!payload) return
    setMessages((prev) =>
      prev.map((row) => (row.clientId === clientId ? { ...row, localStatus: 'sending' as const } : row)),
    )
    void performSend({ ...payload, clientId }, { skipOptimistic: true })
  }

  async function toggleMute() {
    if (!conversation) return
    const next = !conversation.muted
    const result = await setConversationMuted(conversationId, next)
    if (result.ok) patchConversation(conversationId, { muted: next })
  }

  if (loading && messages.length === 0) {
    return <p className="p-4 text-sm text-muted">Loading conversation…</p>
  }

  if (error) {
    return <ErrorState title="Messages unavailable" message={error} onRetry={() => void load()} />
  }

  const headerName = other?.otherDisplayName || other?.otherUsername || 'Conversation'
  const composerSuspended = profile?.status === 'suspended'

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="conversation-thread">
      <header className="flex items-center gap-3 border-b border-line px-3 py-2">
        {showBackLink ? (
          <Link
            to="/messages"
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-ink md:hidden ${focusRing}`}
            data-testid="messages-back"
          >
            Back
          </Link>
        ) : null}
        <ImageWithFallback
          src={other?.otherAvatarUrl ?? undefined}
          alt=""
          label={headerName.charAt(0)}
          className="size-10 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-ink">{headerName}</h2>
          <p className="truncate text-sm text-muted">@{other?.otherUsername ?? 'writer'}</p>
        </div>
        {other ? (
          <SafetyOverflowMenu
            subject={{
              reportedUserId: other.otherUserId,
              displayLabel: other.otherDisplayName || other.otherUsername,
              report: {
                targetType: 'profile',
                targetId: other.otherUserId,
                reportedUserId: other.otherUserId,
                label: 'profile',
              },
            }}
            testId="thread-safety-menu"
          />
        ) : null}
        <button
          type="button"
          onClick={() => void toggleMute()}
          data-testid="conversation-mute-toggle"
          className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-medium text-ink ${focusRing}`}
        >
          {conversation?.muted ? 'Unmute' : 'Mute'}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <section key={group.key} className="mb-6" aria-label={group.label}>
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
            <div className="flex flex-col gap-3">
              {group.messages.map((message) => {
                const threadMessage = message as ThreadMessage
                return (
                <MessageBubble
                  key={threadMessage.clientId ?? threadMessage.id}
                  message={threadMessage}
                  isOwn={message.senderId === user?.id}
                  reportedUserId={other?.otherUserId}
                  sharedPreview={message.sharedCreationId ? sharedPreviews[message.sharedCreationId] : null}
                  onDeleted={() => void load()}
                  onCancelled={() => void load()}
                  onRetry={retrySend}
                />
              )})}
            </div>
          </section>
        ))}
        <div ref={bottomRef} />
      </div>

      {composerSuspended ? (
        <p className="border-t border-line p-3 text-sm text-muted" role="status" data-testid="message-composer-disabled">
          Your account is suspended and cannot send messages.
        </p>
      ) : (
        <MessageComposer
          busy={sendBusy}
          sharedCreationId={composerShareId}
          sharedPostLabel={composerShareLabel}
          onSharedCreationChange={(id, label) => {
            setComposerShareId(id)
            setComposerShareLabel(label ?? null)
          }}
          onSend={(payload) =>
            requestSend({
              ...payload,
              sharedCreationId: payload.sharedCreationId ?? composerShareId,
            })
          }
        />
      )}

      {quietStatus ? (
        <ConsiderateSendingModal
          open={considerateOpen}
          displayName={other?.otherDisplayName || other?.otherUsername || 'They'}
          quietStatus={quietStatus}
          busy={sendBusy}
          onCancel={() => {
            setConsiderateOpen(false)
            setPendingSend(null)
          }}
          onSendAnyway={() => {
            if (pendingSend) void performSend(pendingSend)
          }}
        />
      ) : null}
    </div>
  )
}
