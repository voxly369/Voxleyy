import { useState } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import {
  banUser,
  dismissReport,
  removeContent,
  suspendUser,
  viewReportedPrivateContent,
  warnUser,
} from '../../lib/safety/founderApi.ts'
import { REPORT_REASON_LABELS } from '../../lib/safety/reportSchema.ts'
import type { FounderReportQueueRow } from '../../lib/safety/types.ts'
import { FounderReasonModal } from './FounderReasonModal.tsx'

type PendingAction =
  | { kind: 'dismiss' }
  | { kind: 'remove' }
  | { kind: 'warn' }
  | { kind: 'suspend'; days: 1 | 7 | 30 }
  | { kind: 'ban' }

type FounderReportCardProps = {
  row: FounderReportQueueRow
  onActionComplete: () => void
}

export function FounderReportCard({ row, onActionComplete }: FounderReportCardProps) {
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [warnMessage, setWarnMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [privatePreview, setPrivatePreview] = useState<string | null>(null)
  const [privateBusy, setPrivateBusy] = useState(false)

  const snapshot = row.target_snapshot ?? {}
  const isPrivateTarget = snapshot.audience === 'private' || snapshot.content_audience === 'private'
  const bodyPreview =
    typeof snapshot.body === 'string'
      ? snapshot.body
      : typeof snapshot.body_excerpt === 'string'
        ? snapshot.body_excerpt
        : typeof snapshot.bio === 'string'
          ? snapshot.bio
          : ''

  async function runAction(reason: string) {
    if (!pending) return
    setBusy(true)
    setError(null)
    let result
    switch (pending.kind) {
      case 'dismiss':
        result = await dismissReport(row.report_id, reason)
        break
      case 'remove':
        if (row.target_type !== 'creation' && row.target_type !== 'comment') {
          result = { ok: false as const, error: { code: 'invalid' as const, message: 'Cannot remove this target.' } }
        } else {
          result = await removeContent(row.target_type, row.target_id, reason, row.report_id)
        }
        break
      case 'warn':
        if (!row.reported_user_id) {
          result = { ok: false as const, error: { code: 'invalid' as const, message: 'Missing reported user.' } }
        } else {
          result = await warnUser(row.reported_user_id, warnMessage || reason, reason, row.report_id)
        }
        break
      case 'suspend':
        if (!row.reported_user_id) {
          result = { ok: false as const, error: { code: 'invalid' as const, message: 'Missing reported user.' } }
        } else {
          result = await suspendUser(row.reported_user_id, pending.days, reason, row.report_id)
        }
        break
      case 'ban':
        if (!row.reported_user_id) {
          result = { ok: false as const, error: { code: 'invalid' as const, message: 'Missing reported user.' } }
        } else {
          result = await banUser(row.reported_user_id, reason, row.report_id)
        }
        break
    }
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setPending(null)
    setWarnMessage('')
    onActionComplete()
  }

  return (
    <article
      data-testid="founder-report-card"
      className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {row.target_type} · {REPORT_REASON_LABELS[row.reason]}
          </p>
          <p className="text-sm text-muted">
            Reported {new Date(row.reported_at).toLocaleString()} by @
            {row.reporter_username ?? 'unknown'}
          </p>
        </div>
        <p className="text-sm text-ink">
          Against @
          {row.reported_username ?? 'unknown'} ({row.prior_reports_against_user} prior reports)
        </p>
      </header>
      {row.details ? <p className="mt-3 text-sm text-muted">{row.details}</p> : null}
      {bodyPreview && !isPrivateTarget ? (
        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-base text-ink">{bodyPreview}</p>
      ) : null}
      {isPrivateTarget ? (
        <div className="mt-3 rounded-xl border border-line bg-bg p-3">
          <p className="text-sm text-muted" data-testid="private-content-warning">
            Viewing reported private content is logged in the audit trail.
          </p>
          <button
            type="button"
            disabled={privateBusy}
            data-testid="view-reported-private-content"
            onClick={() => {
              setPrivateBusy(true)
              void viewReportedPrivateContent(row.report_id).then((result) => {
                setPrivateBusy(false)
                if (!result.ok) {
                  setError(result.error.message)
                  return
                }
                const body =
                  typeof result.data.body === 'string'
                    ? result.data.body
                    : typeof result.data.body_text === 'string'
                      ? result.data.body_text
                      : JSON.stringify(result.data)
                setPrivatePreview(body)
              })
            }}
            className={`mt-2 text-sm font-semibold text-coral ${focusRing}`}
          >
            View reported private content
          </button>
          {privatePreview ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink" data-testid="private-content-preview">
              {privatePreview}
            </p>
          ) : null}
        </div>
      ) : null}
      {row.reported_user_id ? (
        <Link
          to={`/u/${row.reported_username ?? ''}`}
          className={`mt-2 inline-flex text-sm text-coral ${focusRing}`}
        >
          View profile
        </Link>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-coral">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPending({ kind: 'dismiss' })}
          className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-semibold ${focusRing}`}
        >
          Dismiss
        </button>
        {(row.target_type === 'creation' || row.target_type === 'comment') && (
          <button
            type="button"
            onClick={() => setPending({ kind: 'remove' })}
            className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-semibold ${focusRing}`}
          >
            Remove content
          </button>
        )}
        <button
          type="button"
          onClick={() => setPending({ kind: 'warn' })}
          className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-semibold ${focusRing}`}
        >
          Warn
        </button>
        {([1, 7, 30] as const).map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setPending({ kind: 'suspend', days })}
            className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-semibold ${focusRing}`}
          >
            Suspend {days}d
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPending({ kind: 'ban' })}
          className={`min-h-11 rounded-2xl bg-coral px-3 text-sm font-semibold text-white ${focusRing}`}
        >
          Ban
        </button>
      </div>
      {pending?.kind === 'warn' ? (
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-sm text-ink">Warning message to user</span>
          <input
            value={warnMessage}
            onChange={(event) => setWarnMessage(event.target.value)}
            maxLength={500}
            className="rounded-2xl border border-line bg-bg px-3 py-2 text-base"
          />
        </label>
      ) : null}
      <FounderReasonModal
        open={pending !== null}
        title={
          pending?.kind === 'dismiss'
            ? 'Dismiss report'
            : pending?.kind === 'remove'
              ? 'Remove content'
              : pending?.kind === 'warn'
                ? 'Warn user'
                : pending?.kind === 'suspend'
                  ? `Suspend ${pending.days} days`
                  : pending?.kind === 'ban'
                    ? 'Ban user'
                    : 'Confirm'
        }
        confirmLabel="Confirm"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void runAction(reason)}
      />
    </article>
  )
}
