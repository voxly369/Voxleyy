import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { focusRing } from '../shell/navItems.ts'
import {
  founderActiveDailyQuoteCount,
  founderListDailyQuotes,
  founderUpsertDailyQuote,
  type FounderDailyQuoteRow,
} from '../../lib/founder/dailyQuotes.ts'

const KINDS: { id: FounderDailyQuoteRow['kind']; label: string }[] = [
  { id: 'public_domain', label: 'Public domain' },
  { id: 'original', label: 'Original' },
  { id: 'owner', label: 'Owner' },
]

export function FounderQuotesTab() {
  const [rows, setRows] = useState<FounderDailyQuoteRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState({ text: '', author: '', source: '', kind: 'original' as FounderDailyQuoteRow['kind'] })

  const load = useCallback(async (append: boolean, cur: string | null) => {
    setLoading(true)
    setMessage(null)
    const result = await founderListDailyQuotes({ cursor: cur })
    setLoading(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setRows((prev) => (append ? [...prev, ...result.rows] : result.rows))
    setNextCursor(result.nextCursor)
    setActiveCount(await founderActiveDailyQuoteCount())
  }, [])

  useEffect(() => {
    void load(false, null)
  }, [load])

  async function toggleActive(row: FounderDailyQuoteRow) {
    setBusy(true)
    const result = await founderUpsertDailyQuote({ id: row.id, active: !row.active })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await load(false, null)
  }

  async function addQuote(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await founderUpsertDailyQuote({
      text: draft.text.trim(),
      author: draft.author.trim(),
      source: draft.source.trim() || null,
      kind: draft.kind,
      active: true,
    })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setDraft({ text: '', author: '', source: '', kind: 'original' })
    await load(false, null)
  }

  return (
    <section className="flex flex-col gap-4" data-testid="founder-quotes-tab">
      <h2 className="font-serif text-xl text-ink">Daily quotes</h2>
      <p className="text-sm text-muted">
        Quotes in the entrance rotation ({activeCount ?? '…'} active). Owner and public-domain lines should stay legally safe.
      </p>
      {message ? (
        <p role="alert" className="text-sm text-coral">
          {message}
        </p>
      ) : null}
      <form onSubmit={addQuote} className="flex flex-col gap-3 rounded-2xl border border-line p-4" data-testid="founder-quotes-add">
        <h3 className="text-sm font-semibold text-ink">Add quote</h3>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Text</span>
          <textarea
            required
            maxLength={300}
            value={draft.text}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            className="min-h-20 rounded-xl border border-line bg-bg px-3 py-2 text-ink"
            data-testid="founder-quotes-text"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Author</span>
          <input
            required
            maxLength={80}
            value={draft.author}
            onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-ink"
            data-testid="founder-quotes-author"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Source (optional)</span>
          <input
            maxLength={120}
            value={draft.source}
            onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Kind</span>
          <select
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as FounderDailyQuoteRow['kind'] }))}
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-ink"
            data-testid="founder-quotes-kind"
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className={`min-h-11 self-start rounded-2xl bg-coral px-4 text-sm font-semibold text-white disabled:opacity-60 ${focusRing}`}
          data-testid="founder-quotes-save"
        >
          Save quote
        </button>
      </form>
      {loading && rows.length === 0 ? <p className="text-sm text-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted" data-testid="founder-quotes-empty">
          No quotes yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line p-4 text-sm" data-testid="founder-quotes-row">
              <p className="text-ink">&ldquo;{row.text}&rdquo;</p>
              <p className="mt-1 text-muted">
                — {row.author}
                {row.source ? ` (${row.source})` : ''} · {row.kind}
                {!row.active ? ' · inactive' : ''}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleActive(row)}
                className={`mt-2 min-h-11 rounded-2xl border border-line px-3 text-sm font-semibold ${focusRing}`}
                data-testid="founder-quotes-toggle"
              >
                {row.active ? 'Deactivate' : 'Activate'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {nextCursor ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(true, nextCursor)}
          className={`min-h-11 self-start rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
        >
          Load more
        </button>
      ) : null}
    </section>
  )
}
