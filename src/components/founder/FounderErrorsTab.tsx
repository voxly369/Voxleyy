import { useEffect, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import {
  founderClientErrorsGrouped,
  founderDismissClientError,
  type FounderClientErrorGroup,
} from '../../lib/founder/clientErrors.ts'

export function FounderErrorsTab() {
  const [rows, setRows] = useState<FounderClientErrorGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setMessage(null)
    const result = await founderClientErrorsGrouped()
    setLoading(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setRows(result.rows)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function dismiss(groupMessage: string) {
    setBusy(true)
    setMessage(null)
    const result = await founderDismissClientError(groupMessage)
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await refresh()
  }

  return (
    <section className="flex flex-col gap-4" data-testid="founder-errors-tab">
      <h2 className="font-serif text-xl text-ink">Client errors</h2>
      <p className="text-sm text-muted">
        Scrubbed browser errors reported via <code className="text-xs">report_client_error</code>, grouped by message.
      </p>
      {loading ? (
        <p className="text-sm text-muted">Loading inbox…</p>
      ) : rows.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-line bg-bg p-6 text-center text-sm text-muted"
          data-testid="founder-errors-empty"
        >
          No client errors in the inbox.
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="founder-errors-list">
          {rows.map((row) => (
            <li
              key={row.message}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid="founder-errors-row"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{row.message}</p>
                <p className="text-xs text-muted">
                  {row.count} report{row.count === 1 ? '' : 's'} · last {row.lastSeen || 'unknown'}
                  {row.dismissed ? ' · dismissed' : ''}
                </p>
              </div>
              {!row.dismissed ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void dismiss(row.message)}
                  className={`min-h-11 shrink-0 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
                  data-testid="founder-errors-dismiss"
                >
                  Dismiss
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {message ? (
        <p role="alert" className="text-sm text-coral">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        disabled={loading || busy}
        onClick={() => void refresh()}
        className={`min-h-11 self-start rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
        data-testid="founder-errors-refresh"
      >
        Refresh
      </button>
    </section>
  )
}
