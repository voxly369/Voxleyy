import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { listMyDraftsPage } from '../lib/creations/api.ts'
import type { DraftsCursor } from '../lib/creations/draftsCursor.ts'
import type { DraftListRow } from '../lib/creations/types.ts'
import { CREATION_TYPE_CARDS } from '../lib/creations/creationTypes.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

function typeLabel(type: DraftListRow['type']): string {
  return CREATION_TYPE_CARDS.find((card) => card.type === type)?.name ?? type
}

function statusChip(row: DraftListRow): string {
  if (row.removed) return 'Removed'
  if (row.status === 'published') return 'Published'
  return 'Draft'
}

function rowHref(row: DraftListRow): string {
  return row.status === 'published' && !row.removed ? `/c/${row.id}` : `/create/${row.id}`
}

export default function DraftsListPage() {
  useDocumentTitle('Drafts')
  const [rows, setRows] = useState<DraftListRow[]>([])
  const [nextCursor, setNextCursor] = useState<DraftsCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      const result = await listMyDraftsPage(null)
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setRows(result.data.rows)
      setNextCursor(result.data.nextCursor)
    })()
    return () => {
      active = false
    }
  }, [attempt])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const result = await listMyDraftsPage(nextCursor)
    setLoadingMore(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRows((existing) => [...existing, ...result.data.rows])
    setNextCursor(result.data.nextCursor)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Skeleton variant="text-lines" lines={6} />
      </div>
    )
  }

  if (error && rows.length === 0) {
    return (
      <ErrorState title="Drafts did not load" message={error} onRetry={() => setAttempt((n) => n + 1)} />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 pb-28">
      <PageHeader title="Drafts" />
      {rows.length === 0 ? (
        <EmptyState
          title="No drafts yet"
          message="Start something new and it will appear here."
          action={
            <Link to="/create" className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-4 font-semibold text-white ${focusRing}`}>
              Start writing
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={rowHref(row)}
                className={`flex min-h-11 flex-col gap-1 rounded-2xl border border-line bg-surface p-4 ${focusRing}`}
              >
                <span className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted">
                  <span>{statusChip(row)}</span>
                  <span>{typeLabel(row.type)}</span>
                  <span>
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
                      new Date(row.updatedAt),
                    )}
                  </span>
                </span>
                <span className="font-serif text-lg text-ink">{row.title?.trim() || 'Untitled'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error && rows.length > 0 ? <p className="text-sm text-coral">{error}</p> : null}
      {nextCursor ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          className={`min-h-11 rounded-2xl border border-line px-4 text-base font-medium ${focusRing}`}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}
