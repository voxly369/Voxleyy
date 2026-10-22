import { useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { FOUNDER_REASON_MAX, validateFounderReason } from '../../lib/safety/founderReason.ts'

type FounderReasonModalProps = {
  open: boolean
  title: string
  confirmLabel: string
  busy?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}

export function FounderReasonModal({
  open,
  title,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: FounderReasonModalProps) {
  const titleId = useId()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const validated = validateFounderReason(reason)
    if (!validated.ok) {
      setError(validated.message)
      return
    }
    setError(null)
    onConfirm(validated.reason)
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeOnEscape={!busy}
      labelledBy={titleId}
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
    >
      <form onSubmit={submit}>
        <h2 id={titleId} className="font-serif text-xl text-ink">
          {title}
        </h2>
        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">Reason (required)</span>
          <textarea
            value={reason}
            maxLength={FOUNDER_REASON_MAX}
            rows={4}
            onChange={(event) => setReason(event.target.value)}
            className="rounded-2xl border border-line bg-bg px-3 py-2 text-base"
          />
          <span className="text-sm text-muted">
            {reason.length}/{FOUNDER_REASON_MAX}
          </span>
        </label>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-coral">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className={`min-h-11 rounded-2xl px-4 ${focusRing}`}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`min-h-11 rounded-2xl bg-coral px-4 font-semibold text-white disabled:opacity-50 ${focusRing}`}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
