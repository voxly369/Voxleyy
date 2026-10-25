import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { deleteCoverDesign, listCoverDesigns, type CoverDesignRecord } from '../lib/coverStudio/coverDesignsApi.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function CoverDesignsListPage() {
  useDocumentTitle('Cover designs')
  const [rows, setRows] = useState<CoverDesignRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listCoverDesigns().then((result) => {
      if (!result.ok) setError(result.error.message)
      else setRows(result.data)
    })
  }, [])

  if (error) return <ErrorState title="Cover designs" message={error} onRetry={() => window.location.reload()} />
  if (!rows) {
    return (
      <PageContainer className="py-8">
        <Skeleton />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="flex flex-col gap-6 py-6 md:py-8">
      <PageHeader title="Cover designs" />
      <p className="text-sm text-muted">Saved Cover Studio layouts (up to 50 per account).</p>
      {rows.length === 0 ? (
        <EmptyState title="No saved covers yet" message="Open Cover Studio from a book to save a design." />
      ) : (
        <ul className="flex flex-col gap-2" data-testid="cover-designs-list">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-4">
              <div>
                <p className="font-medium text-ink">{row.name}</p>
                <p className="text-sm text-muted">Updated {new Date(row.updatedAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.bookId ? (
                  <Link
                    to={`/books/${row.bookId}/cover`}
                    className={`min-h-11 rounded-xl border border-line px-4 py-2 text-sm ${focusRing}`}
                  >
                    Open in studio
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    void deleteCoverDesign(row.id).then((result) => {
                      if (result.ok) setRows((prev) => prev?.filter((r) => r.id !== row.id) ?? [])
                    })
                  }
                  className={`min-h-11 rounded-xl border border-line px-4 text-sm text-coral ${focusRing}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
