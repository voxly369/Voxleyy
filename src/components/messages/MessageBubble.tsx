import { useState } from 'react'
import { ConfirmDialog } from '../states/ConfirmDialog.tsx'
import { focusRing } from '../shell/navItems.ts'
import { ReportSheet } from '../safety/ReportSheet.tsx'
import { cancelScheduledMessage, deleteMessage } from '../../lib/messages/api.ts'
import type { SharedCreationPreview, ThreadMessage } from '../../lib/messages/types.ts'
import { SharedPostCard } from './SharedPostCard.tsx'

type MessageBubbleProps = {
  message: ThreadMessage
  isOwn: boolean
  reportedUserId?: string | null
  sharedPreview?: SharedCreationPreview | null
  onDeleted?: (messageId: string) => void
  onCancelled?: (messageId: string) => void
  onRetry?: (clientId: string) => void
}

export function MessageBubble({
  message,
  isOwn,
  reportedUserId,
  sharedPreview,
  onDeleted,
  onCancelled,
  onRetry,
}: MessageBubbleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const scheduled = message.isScheduled && isOwn && !message.localStatus
  const deleted = message.isDeleted
  const failed = message.localStatus === 'failed'
  const sending = message.localStatus === 'sending'

  async function onDeleteConfirm() {
    setBusy(true)
    const result = await deleteMessage(message.id)
    setBusy(false)
    setConfirmOpen(false)
    if (result.ok) onDeleted?.(message.id)
  }

  async function onCancelConfirm() {
    setBusy(true)
    const result = await cancelScheduledMessage(message.id)
    setBusy(false)
    setCancelOpen(false)
    if (result.ok) onCancelled?.(message.id)
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      data-testid="message-bubble"
      data-own={isOwn ? 'true' : 'false'}
      data-local-status={message.localStatus ?? 'sent'}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-base ${
          isOwn ? 'bg-coral text-white' : 'border border-line bg-raised text-ink'
        } ${failed ? 'ring-2 ring-coral/60' : ''}`}
      >
        {deleted ? (
          <p className="italic opacity-80" data-testid="message-tombstone">
            Message deleted
          </p>
        ) : (
          <>
            {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
            {sharedPreview ? <SharedPostCard preview={sharedPreview} className="mt-2 !bg-bg/40" /> : null}
            {scheduled ? (
              <p className="mt-1 text-xs opacity-90" data-testid="message-scheduled-label">
                Scheduled
              </p>
            ) : null}
            {sending ? (
              <p className="mt-1 text-xs opacity-90" data-testid="message-sending-label">Sending…</p>
            ) : null}
            {failed ? (
              <p className="mt-1 text-xs font-semibold" data-testid="message-failed-label">Could not send</p>
            ) : null}
          </>
        )}
        <div className="mt-2 flex flex-wrap gap-3">
          {isOwn && !deleted && !message.localStatus ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className={`text-xs underline opacity-90 ${focusRing}`}
            >
              Delete
            </button>
          ) : null}
          {scheduled ? (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              data-testid="cancel-scheduled-message"
              className={`text-xs underline opacity-90 ${focusRing}`}
            >
              Cancel schedule
            </button>
          ) : null}
          {failed && message.clientId ? (
            <button
              type="button"
              onClick={() => onRetry?.(message.clientId!)}
              data-testid="retry-failed-message"
              className={`text-xs font-semibold underline ${focusRing}`}
            >
              Retry
            </button>
          ) : null}
          {!isOwn && !deleted && reportedUserId ? (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              data-testid="report-message"
              className={`text-xs underline opacity-90 ${focusRing}`}
            >
              Report
            </button>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this message?"
        message="It will be removed for everyone in this conversation."
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void onDeleteConfirm()}
      />
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel scheduled message?"
        message="This message will not be delivered."
        confirmLabel="Cancel schedule"
        busy={busy}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => void onCancelConfirm()}
      />
      <ReportSheet
        open={reportOpen}
        target={
          reportOpen
            ? {
                targetType: 'message',
                targetId: message.id,
                reportedUserId: reportedUserId ?? undefined,
                label: 'message',
              }
            : null
        }
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
}
