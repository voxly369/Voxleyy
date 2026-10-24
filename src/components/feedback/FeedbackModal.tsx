import { useId, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Modal } from '../shell/Modal.tsx'
import { accessibleCoralFill, focusRing } from '../shell/navItems.ts'
import { feedbackCategories, feedbackFormSchema, type FeedbackCategory } from '../../lib/feedback/schemas.ts'
import { submitAppFeedback } from '../../lib/feedback/api.ts'
import { useToast } from '../../lib/shell/useToast.ts'
import { scrubErrorPayload } from '../../lib/errors/scrubError.ts'

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  idea: 'Idea',
  felt_off: 'Something felt off',
  praise: 'Praise',
}

type FeedbackModalProps = {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const titleId = useId()
  const descId = useId()
  const location = useLocation()
  const { showToast } = useToast()
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [message, setMessage] = useState('')
  const [includePage, setIncludePage] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const parsed = feedbackFormSchema.safeParse({ category, message, includePage })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your message and try again.')
      return
    }
    setBusy(true)
    const pathOnly = scrubErrorPayload(location.pathname) as string
    const viewport = `${window.innerWidth}x${window.innerHeight}`
    const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'
    const result = await submitAppFeedback({
      category: parsed.data.category,
      message: parsed.data.message,
      pagePath: parsed.data.includePage ? pathOnly : null,
      appVersion,
      viewport,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    showToast('Thank you, the Founder will read this.')
    setMessage('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} describedBy={descId} className="w-full max-w-lg">
      <div
        className="flex max-h-[min(90dvh,640px)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl"
        data-testid="feedback-modal"
      >
        <h2 id={titleId} className="font-serif text-2xl text-ink">
          Send feedback
        </h2>
        <p id={descId} className="text-sm text-muted">
          Tell the Founder what is working, what is not, or what you wish Voxly could do. Text only — no attachments.
        </p>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-ink">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
            className={`min-h-11 rounded-2xl border border-line bg-bg px-3 ${focusRing}`}
            data-testid="feedback-category"
          >
            {feedbackCategories.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-ink">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            maxLength={2000}
            className={`rounded-2xl border border-line bg-bg px-3 py-2 ${focusRing}`}
            data-testid="feedback-message"
          />
          <span className="text-xs text-muted">{message.trim().length} / 2,000</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={includePage}
            onChange={(event) => setIncludePage(event.target.checked)}
            className="size-4 rounded border-line"
            data-testid="feedback-include-page"
          />
          Include this page (path only)
        </label>
        {error ? (
          <div className="flex flex-col gap-2" role="alert">
            <p className="text-sm text-coral">{error}</p>
            <button
              type="button"
              onClick={() => void submit()}
              className={`min-h-11 self-start rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
              data-testid="feedback-retry"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={`min-h-11 rounded-2xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${accessibleCoralFill} ${focusRing}`}
            data-testid="feedback-submit"
          >
            {busy ? 'Sending…' : 'Send'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-11 rounded-2xl border border-line px-5 text-sm font-semibold ${focusRing}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
