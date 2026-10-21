import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import type { DraftListRow } from '../../lib/creations/types.ts'

type DraftsBooksGroupProps = {
  rows: DraftListRow[]
  onDelete: (row: DraftListRow) => void
}

export function DraftsBooksGroup({ rows, onDelete }: DraftsBooksGroupProps) {
  const books = rows.filter((r) => !r.removed && r.type === 'book')

  if (books.length === 0) {
    return (
      <section className="flex flex-col gap-2" data-testid="drafts-books-group">
        <h3 className="text-base font-semibold text-ink">
          Books <span className="text-muted">(0)</span>
        </h3>
        <p className="text-sm text-muted">Books you start from Create will appear here.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2" data-testid="drafts-books-group">
      <h3 className="text-base font-semibold text-ink">
        Books <span className="text-muted">({books.length})</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {books.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2 rounded-2xl border border-line p-3">
            <Link to={`/books/${row.id}/builder`} className={`min-h-11 flex-1 ${focusRing}`}>
              <span className="font-medium text-ink">{row.title?.trim() || 'Untitled book'}</span>
              <span className="block text-sm text-muted">Book · {row.status}</span>
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
