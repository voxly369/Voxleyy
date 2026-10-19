import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../states/ConfirmDialog.tsx'
import { EmptyState } from '../states/EmptyState.tsx'
import { ErrorState } from '../states/ErrorState.tsx'
import { Skeleton } from '../states/Skeleton.tsx'
import { focusRing } from '../shell/navItems.ts'
import { deleteCreation, listMyDraftsPage } from '../../lib/creations/api.ts'
import type { DraftListRow } from '../../lib/creations/types.ts'
import type { DraftsCursor } from '../../lib/creations/draftsCursor.ts'
import { CREATION_TYPE_CARDS } from '../../lib/creations/creationTypes.ts'

function sectionRows(rows: DraftListRow[]) {
  const drafts = rows.filter((r) => !r.removed && r.status === 'draft')
  const journalPrivate = rows.filter((r) => !r.removed && r.audience === 'private')
  const unlisted = rows.filter((r) => !r.removed && r.status === 'published' && r.audience === 'unlisted')
  return { drafts, journalPrivate, unlisted }
}

function DraftSection({
  title,
  rows,
  onDelete,
}: {
  title: string
  rows: DraftListRow[]
  onDelete: (row: DraftListRow) => void
}) {
  if (rows.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-ink">
          {title} <span className="text-muted">(0)</span>
        </h3>
        <EmptyState title="Nothing here yet" message={`${title} you create will show up here.`} />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold text-ink">
        {title} <span className="text-muted">({rows.length})</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2 rounded-2xl border border-line p-3">
            <Link to={`/create/${row.id}`} className={`min-h-11 flex-1 ${focusRing}`}>
              <span className="font-medium text-ink">{row.title?.trim() || 'Untitled'}</span>
              <span className="block text-sm text-muted">
                {CREATION_TYPE_CARDS.find((c) => c.type === row.type)?.name ?? row.type}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => onDelete(row)}
              className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-coral ${focusRing}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ProfileDraftsPanel() {
  const [rows, setRows] = useState<DraftListRow[]>([])
  const [nextCursor, setNextCursor] = useState<DraftsCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DraftListRow | null>(null)

  async function load(cursor: DraftsCursor | null) {
    const result = await listMyDraftsPage(cursor)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setError(null)
    setRows((existing) => (cursor ? [...existing, ...result.data.rows] : result.data.rows))
    setNextCursor(result.data.nextCursor)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await listMyDraftsPage(null)
      if (cancelled) return
      if (!result.ok) {
        setError(result.error.message)
      } else {
        setError(null)
        setRows(result.data.rows)
        setNextCursor(result.data.nextCursor)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sections = sectionRows(rows)

  if (loading) return <Skeleton variant="text-lines" lines={6} />
  if (error) return <ErrorState title="Drafts did not load" message={error} onRetry={() => void load(null)} />

  return (
    <div className="flex flex-col gap-8">
      <DraftSection title="Drafts" rows={sections.drafts} onDelete={setPendingDelete} />
      <DraftSection title="Journal and private entries" rows={sections.journalPrivate} onDelete={setPendingDelete} />
      <DraftSection title="Unlisted" rows={sections.unlisted} onDelete={setPendingDelete} />
      {nextCursor ? (
        <button
          type="button"
          onClick={() => void load(nextCursor)}
          className={`min-h-11 self-center rounded-2xl border border-line px-4 ${focusRing}`}
        >
          Load more
        </button>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this work?"
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          void deleteCreation(pendingDelete.id).then((result) => {
            if (result.ok) {
              setRows((existing) => existing.filter((r) => r.id !== pendingDelete.id))
              setPendingDelete(null)
            }
          })
        }}
      />
    </div>
  )
}
