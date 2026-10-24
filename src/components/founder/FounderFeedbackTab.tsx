import { useCallback, useEffect, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import {
  founderFeedbackUnreadCount,
  founderListFeedback,
  founderUpdateFeedback,
  type FounderFeedbackRow,
} from '../../lib/founder/feedback.ts'

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'bug', label: 'Bug' },
  { id: 'idea', label: 'Idea' },
  { id: 'felt_off', label: 'Felt off' },
  { id: 'praise', label: 'Praise' },
]

export function FounderFeedbackTab() {
  const [filter, setFilter] = useState('')
  const [rows, setRows] = useState<FounderFeedbackRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  const load = useCallback(
    async (append: boolean, cat: string, cur: string | null) => {
      setLoading(true)
      setMessage(null)
      const result = await founderListFeedback({ category: cat || null, cursor: cur })
      setLoading(false)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setRows((prev) => (append ? [...prev, ...result.rows] : result.rows))
      setNextCursor(result.nextCursor)
      const count = await founderFeedbackUnreadCount()
      setUnread(count)
    },
    [],
  )

  useEffect(() => {
    void load(false, filter, null)
  }, [filter, load])

  async function markRead(row: FounderFeedbackRow) {
    setBusy(true)
    const result = await founderUpdateFeedback({ id: row.id, read: true })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await load(false, filter, null)
  }

  async function markDone(row: FounderFeedbackRow) {
    setBusy(true)
    const result = await founderUpdateFeedback({ id: row.id, done: true, read: true })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await load(false, filter, null)
  }

  return (
    <section className="flex flex-col gap-4" data-testid="founder-feedback-tab">
      <h2 className="font-serif text-xl text-ink">Feedback</h2>
      <p className="text-sm text-muted">In-app messages from beta testers, newest first.</p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Feedback category">
        {FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-11 rounded-2xl border px-4 text-sm font-semibold ${filter === f.id ? 'border-coral text-coral' : 'border-line'} ${focusRing}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {unread > 0 ? (
        <p className="text-sm text-muted" data-testid="founder-feedback-unread">
          {unread} unread
        </p>
      ) : null}
      {loading && rows.length === 0 ? <p className="text-sm text-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted" data-testid="founder-feedback-empty">
          No feedback yet — when someone sends a note, it will appear here.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-2xl border p-4 ${row.readAt ? 'border-line bg-surface' : 'border-coral/30 bg-bg'}`}
              data-testid="founder-feedback-row"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span className="font-semibold uppercase tracking-wide text-ink">{row.category}</span>
                <span>{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{row.message}</p>
              {row.pagePath ? <p className="mt-1 text-xs text-muted">Page: {row.pagePath}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {!row.readAt ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void markRead(row)}
                    className={`min-h-9 rounded-xl border border-line px-3 text-xs font-semibold ${focusRing}`}
                  >
                    Mark read
                  </button>
                ) : null}
                {!row.doneAt ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void markDone(row)}
                    className={`min-h-9 rounded-xl border border-line px-3 text-xs font-semibold ${focusRing}`}
                    data-testid="founder-feedback-mark-done"
                  >
                    Mark done
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-coral">Done</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {nextCursor ? (
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void load(true, filter, nextCursor)}
          className={`min-h-11 self-start rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
        >
          Load more
        </button>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-coral">
          {message}
        </p>
      ) : null}
    </section>
  )
}
