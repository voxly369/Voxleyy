import { useState } from 'react'
import { ConfirmDialog } from '../states/ConfirmDialog.tsx'
import { focusRing } from '../shell/navItems.ts'
import { deleteMessage } from '../../lib/messages/api.ts'
import type { SharedCreationPreview, VisibleMessage } from '../../lib/messages/types.ts'
import { SharedPostCard } from './SharedPostCard.tsx'

type MessageBubbleProps = {
  message: VisibleMessage
  isOwn: boolean
  sharedPreview?: SharedCreationPreview | null
  onDeleted?: (messageId: string) => void
}

export function MessageBubble({ message, isOwn, sharedPreview, onDeleted }: MessageBubbleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const scheduled = message.isScheduled && isOwn
  const deleted = message.isDeleted

  async function onDeleteConfirm() {
    setBusy(true)
    const result = await deleteMessage(message.id)
    setBusy(false)
    setConfirmOpen(false)
    if (result.ok) onDeleted?.(message.id)
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      data-testid="message-bubble"
      data-own={isOwn ? 'true' : 'false'}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-base ${
          isOwn ? 'bg-coral text-white' : 'border border-line bg-raised text-ink'
        }`}
      >
        {deleted ? (
          <p className="italic opacity-80">Message deleted</p>
        ) : (
          <>
            {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
            {sharedPreview ? <SharedPostCard preview={sharedPreview} className="mt-2 !bg-bg/40" /> : null}
            {scheduled ? (
              <p className="mt-1 text-xs opacity-90" data-testid="message-scheduled-label">
                Scheduled
              </p>
            ) : null}
          </>
        )}
        {isOwn && !deleted ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className={`mt-2 text-xs underline opacity-90 ${focusRing}`}
          >
            Delete
          </button>
        ) : null}
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
    </div>
  )
}
