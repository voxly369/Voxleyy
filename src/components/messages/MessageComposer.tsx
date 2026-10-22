import { useId, useState, type FormEvent } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { MESSAGE_BODY_MAX } from '../../lib/messages/types.ts'
import type { DmSharePostHit } from '../../lib/messages/types.ts'
import { remainingCharacters, validateMessageBody } from '../../lib/messages/validation.ts'
import { SharePostPicker } from './SharePostPicker.tsx'

type MessageComposerProps = {
  disabled?: boolean
  busy?: boolean
  initialBody?: string
  sharedCreationId?: string | null
  sharedPostLabel?: string | null
  onSharedCreationChange?: (creationId: string | null, label?: string | null) => void
  onSend: (payload: { body: string; deliverAt: string | null; sharedCreationId: string | null }) => void
}

export function MessageComposer({
  disabled = false,
  busy = false,
  initialBody = '',
  sharedCreationId = null,
  sharedPostLabel = null,
  onSharedCreationChange,
  onSend,
}: MessageComposerProps) {
  const [body, setBody] = useState(initialBody)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaId = useId()
  const remaining = remainingCharacters(body)

  function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const validated = validateMessageBody(body)
    if (!validated.ok) {
      setError(validated.message)
      return
    }
    let deliverAt: string | null = null
    if (scheduleOpen && scheduleValue) {
      const at = new Date(scheduleValue)
      if (Number.isNaN(at.getTime())) {
        setError('Choose a valid date and time.')
        return
      }
      deliverAt = at.toISOString()
    }
    onSend({ body: validated.body, deliverAt, sharedCreationId })
    setBody('')
    setScheduleOpen(false)
    setScheduleValue('')
  }

  function onShareSelect(post: DmSharePostHit) {
    const label = post.title?.trim() || post.caption?.trim() || 'Shared post'
    onSharedCreationChange?.(post.id, label)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-line bg-surface p-3" data-testid="message-composer">
      {sharedCreationId ? (
        <div className="flex items-center justify-between gap-2 text-sm" data-testid="composer-shared-post">
          <p className="text-muted">
            Sharing: <span className="font-medium text-ink">{sharedPostLabel ?? 'A post'}</span>
          </p>
          {onSharedCreationChange ? (
            <button
              type="button"
              onClick={() => onSharedCreationChange(null, null)}
              className={`text-coral underline ${focusRing}`}
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
      <label htmlFor={textareaId} className="sr-only">
        Message
      </label>
      <textarea
        id={textareaId}
        value={body}
        disabled={disabled || busy}
        maxLength={MESSAGE_BODY_MAX}
        rows={3}
        placeholder="Write a message…"
        onChange={(event) => setBody(event.target.value)}
        className={`min-h-[4.5rem] w-full resize-y rounded-2xl border border-line bg-bg px-3 py-2 text-base text-ink ${focusRing}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setScheduleOpen((value) => !value)}
            className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-medium text-ink ${focusRing}`}
          >
            Schedule
          </button>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setPickerOpen(true)}
            data-testid="share-post-picker-trigger"
            className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-medium text-ink ${focusRing}`}
          >
            Share post
          </button>
        </div>
        <p className="text-sm text-muted" aria-live="polite" data-testid="message-char-count">
          {remaining}
        </p>
        <button
          type="submit"
          disabled={disabled || busy || !body.trim()}
          className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
        >
          {busy ? 'Sending…' : scheduleOpen && scheduleValue ? 'Schedule' : 'Send'}
        </button>
      </div>
      {scheduleOpen ? (
        <input
          type="datetime-local"
          value={scheduleValue}
          onChange={(event) => setScheduleValue(event.target.value)}
          className={`min-h-11 rounded-2xl border border-line bg-bg px-3 text-base ${focusRing}`}
          data-testid="message-schedule-input"
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
      <SharePostPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={onShareSelect} />
    </form>
  )
}
