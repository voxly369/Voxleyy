import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { FounderReportCard } from '../components/safety/FounderReportCard.tsx'
import {
  decideAppeal,
  founderUserSearch,
  listFounderAppeals,
  listFounderAuditLog,
  listFounderContent,
  listFounderReportQueue,
  restoreContent,
  unbanUser,
} from '../lib/safety/founderApi.ts'
import { statusDisplay } from '../lib/safety/moderationDisplay.ts'
import type { FounderAuditRow, FounderContentRow, FounderReportQueueRow, FounderUserSearchHit } from '../lib/safety/types.ts'
import { FounderReasonModal } from '../components/safety/FounderReasonModal.tsx'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

type FounderTab = 'overview' | 'reports' | 'users' | 'content' | 'appeals' | 'audit'

const TABS: { id: FounderTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'reports', label: 'Report queue' },
  { id: 'users', label: 'Users' },
  { id: 'content', label: 'Content' },
  { id: 'appeals', label: 'Appeals' },
  { id: 'audit', label: 'Audit log' },
]

export default function FounderPage() {
  useDocumentTitle('Founder')
  const [tab, setTab] = useState<FounderTab>('reports')
  const [reportRows, setReportRows] = useState<FounderReportQueueRow[]>([])
  const [reportCursor, setReportCursor] = useState<string | null>(null)
  const [reportNext, setReportNext] = useState<string | null>(null)
  const [contentRows, setContentRows] = useState<FounderContentRow[]>([])
  const [contentCursor, setContentCursor] = useState<string | null>(null)
  const [contentNext, setContentNext] = useState<string | null>(null)
  const [auditRows, setAuditRows] = useState<FounderAuditRow[]>([])
  const [_auditCursor, setAuditCursor] = useState<string | null>(null)
  const [auditNext, setAuditNext] = useState<string | null>(null)
  const [appeals, setAppeals] = useState<Record<string, unknown>[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [userHits, setUserHits] = useState<FounderUserSearchHit[]>([])
  const [restoreTarget, setRestoreTarget] = useState<FounderContentRow | null>(null)
  const [unbanTarget, setUnbanTarget] = useState<FounderUserSearchHit | null>(null)
  const [appealDecision, setAppealDecision] = useState<{ id: string; decision: 'upheld' | 'overturned' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReports = useCallback(async (cursor: string | null, append: boolean) => {
    const result = await listFounderReportQueue(cursor)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setReportRows((prev) => (append ? [...prev, ...result.data.rows] : result.data.rows))
    setReportNext(result.data.nextCursor)
    setReportCursor(cursor)
  }, [])

  const loadContent = useCallback(async (cursor: string | null, append: boolean) => {
    const result = await listFounderContent(cursor)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setContentRows((prev) => (append ? [...prev, ...result.data.rows] : result.data.rows))
    setContentNext(result.data.nextCursor)
    setContentCursor(cursor)
  }, [])

  const loadAudit = useCallback(async (cursor: string | null, append: boolean) => {
    const result = await listFounderAuditLog(cursor)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setAuditRows((prev) => (append ? [...prev, ...result.data.rows] : result.data.rows))
    setAuditNext(result.data.nextCursor)
    setAuditCursor(cursor)
  }, [])

  useEffect(() => {
    setError(null)
    if (tab === 'reports') void loadReports(null, false)
    if (tab === 'content') void loadContent(null, false)
    if (tab === 'audit') void loadAudit(null, false)
    if (tab === 'appeals') {
      void (async () => {
        const result = await listFounderAppeals()
        if (result.ok) setAppeals(result.data)
      })()
    }
  }, [tab, loadReports, loadContent, loadAudit])

  async function searchUsers() {
    const result = await founderUserSearch(userQuery)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setUserHits(result.data)
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Founder" />
      <nav aria-label="Founder sections" className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
            className={`min-h-11 rounded-2xl px-4 text-sm font-semibold ${tab === item.id ? 'bg-coral text-white' : 'bg-raised text-ink'} ${focusRing}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}

      {tab === 'overview' ? (
        <EmptyState title="Overview" message="Overview metrics arrive in a later step." />
      ) : null}

      {tab === 'reports' ? (
        <div className="flex flex-col gap-4" data-testid="founder-report-queue">
          {reportRows.length === 0 ? (
            <EmptyState title="Report queue" message="No open reports." />
          ) : (
            reportRows.map((row) => (
              <FounderReportCard key={row.report_id} row={row} onActionComplete={() => void loadReports(reportCursor, false)} />
            ))
          )}
          {reportNext ? (
            <button
              type="button"
              onClick={() => void loadReports(reportNext, true)}
              className={`min-h-11 self-start rounded-2xl border border-line px-4 font-semibold ${focusRing}`}
            >
              Load more
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'users' ? (
        <section className="flex flex-col gap-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void searchUsers()
            }}
          >
            <input
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Search name, username, or email"
              className="min-h-11 flex-1 rounded-2xl border border-line bg-bg px-3 text-base"
            />
            <button type="submit" className={`min-h-11 rounded-2xl bg-coral px-4 font-semibold text-white ${focusRing}`}>
              Search
            </button>
          </form>
          <ul className="flex flex-col gap-2">
            {userHits.map((hit) => (
              <li key={hit.id} className="rounded-2xl border border-line bg-surface p-4">
                <p className="font-medium text-ink">
                  {hit.display_name} (@{hit.username})
                </p>
                <p className="text-sm text-muted">
                  {statusDisplay(hit.status)} · {hit.role} · {hit.email}
                </p>
                {hit.status === 'banned' ? (
                  <button
                    type="button"
                    onClick={() => setUnbanTarget(hit)}
                    className={`mt-2 text-sm font-semibold text-coral ${focusRing}`}
                  >
                    Unban
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'content' ? (
        <div className="flex flex-col gap-3">
          {contentRows.map((row) => (
            <article key={`${row.content_kind}-${row.content_id}`} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs uppercase text-muted">
                {row.content_kind} · @{row.author_username} · {row.is_removed ? 'removed' : 'live'}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-ink">{row.body_excerpt ?? row.title}</p>
              {row.is_removed ? (
                <button
                  type="button"
                  onClick={() => setRestoreTarget(row)}
                  className={`mt-2 text-sm font-semibold text-coral ${focusRing}`}
                >
                  Restore
                </button>
              ) : null}
            </article>
          ))}
          {contentNext ? (
            <button type="button" onClick={() => void loadContent(contentNext, true)} className={`min-h-11 self-start rounded-2xl border px-4 ${focusRing}`}>
              Load more
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'appeals' ? (
        <ul className="flex flex-col gap-3">
          {appeals.length === 0 ? (
            <EmptyState title="Appeals" message="No pending appeals." />
          ) : (
            appeals.map((row) => (
              <li key={String(row.id)} className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-sm text-ink">{String(row.message)}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAppealDecision({ id: String(row.id), decision: 'upheld' })}
                    className={`min-h-11 rounded-2xl border px-3 text-sm font-semibold ${focusRing}`}
                  >
                    Uphold
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppealDecision({ id: String(row.id), decision: 'overturned' })}
                    className={`min-h-11 rounded-2xl bg-coral px-3 text-sm font-semibold text-white ${focusRing}`}
                  >
                    Overturn
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {tab === 'audit' ? (
        <div className="flex flex-col gap-2">
          {auditRows.map((row) => (
            <div key={row.id} className="rounded-xl border border-line bg-bg px-3 py-2 text-sm">
              <span className="font-semibold">{row.action}</span> · {row.target_type} · {row.reason}
              <span className="block text-muted">{new Date(row.created_at).toLocaleString()}</span>
            </div>
          ))}
          {auditNext ? (
            <button type="button" onClick={() => void loadAudit(auditNext, true)} className={`min-h-11 self-start rounded-2xl border px-4 ${focusRing}`}>
              Load more
            </button>
          ) : null}
        </div>
      ) : null}

      <FounderReasonModal
        open={restoreTarget !== null}
        title="Restore content"
        confirmLabel="Restore"
        busy={busy}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={(reason) => {
          if (!restoreTarget) return
          setBusy(true)
          void restoreContent(restoreTarget.content_kind, restoreTarget.content_id, reason).then((result) => {
            setBusy(false)
            if (result.ok) {
              setRestoreTarget(null)
              void loadContent(contentCursor, false)
            }
          })
        }}
      />
      <FounderReasonModal
        open={unbanTarget !== null}
        title="Unban user"
        confirmLabel="Unban"
        busy={busy}
        onCancel={() => setUnbanTarget(null)}
        onConfirm={(reason) => {
          if (!unbanTarget) return
          setBusy(true)
          void unbanUser(unbanTarget.id, reason).then((result) => {
            setBusy(false)
            if (result.ok) {
              setUnbanTarget(null)
              void searchUsers()
            }
          })
        }}
      />
      <FounderReasonModal
        open={appealDecision !== null}
        title="Decide appeal"
        confirmLabel="Save decision"
        busy={busy}
        onCancel={() => setAppealDecision(null)}
        onConfirm={(reason) => {
          if (!appealDecision) return
          setBusy(true)
          void decideAppeal(appealDecision.id, appealDecision.decision, reason).then((result) => {
            setBusy(false)
            if (result.ok) {
              setAppealDecision(null)
              void listFounderAppeals().then((r) => {
                if (r.ok) setAppeals(r.data)
              })
            }
          })
        }}
      />
    </PageContainer>
  )
}
