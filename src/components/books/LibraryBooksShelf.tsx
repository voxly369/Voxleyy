import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HorizontalChipRow } from '../discover/HorizontalChipRow.tsx'
import { CoverFrame } from '../creations/CoverFrame.tsx'
import { focusRing } from '../shell/navItems.ts'
import type { LibraryBookRow } from '../../lib/books/bookSchema.ts'

type LibraryBooksShelfProps = {
  books: LibraryBookRow[]
}

const FILTERS = ['All', 'Reading', 'Finished', 'Rented', 'Subscribed'] as const
type BooksFilter = (typeof FILTERS)[number]

function matchesFilter(book: LibraryBookRow, filter: BooksFilter): boolean {
  if (filter === 'All') return true
  if (filter === 'Reading') return book.readingStatus === 'Reading'
  if (filter === 'Finished') return book.readingStatus === 'Finished'
  if (filter === 'Rented') return book.saleModel === 'rental' || book.rentalDaysLeft != null
  if (filter === 'Subscribed') return book.saleModel === 'subscription'
  return true
}

export function LibraryBooksShelf({ books }: LibraryBooksShelfProps) {
  const [filter, setFilter] = useState<BooksFilter>('All')
  const filtered = useMemo(() => books.filter((b) => matchesFilter(b, filter)), [books, filter])

  if (books.length === 0) {
    return (
      <p className="text-sm text-muted" data-testid="library-books-empty">
        Books you add or buy will appear here.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="library-books-shelf">
      <HorizontalChipRow
        variant="filter"
        title="Filter"
        chips={FILTERS.map((label) => ({
          id: label,
          label,
          selected: filter === label,
          onSelect: () => setFilter(label),
        }))}
      />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((book) => {
          const href =
            book.lastChapterId && book.readingStatus !== 'Not started'
              ? `/read/book/${book.bookId}/${book.lastChapterId}`
              : `/books/${book.bookId}`
          return (
            <li key={book.bookId}>
              <Link
                to={href}
                className={`flex min-h-11 flex-col gap-2 rounded-2xl border border-line bg-surface p-3 ${focusRing}`}
              >
                {book.coverUrl ? (
                  <CoverFrame src={book.coverUrl} alt="" label="" className="aspect-[2/3] w-full rounded-lg" />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-bg text-xs text-muted">
                    No cover
                  </div>
                )}
                <span className="font-serif text-base text-ink line-clamp-2">{book.title}</span>
                <span className="text-xs text-muted">
                  {book.authorDisplayName || book.authorUsername} · {book.readingStatus}
                </span>
                {book.percent > 0 ? <span className="text-xs text-muted">{Math.round(book.percent)}% read</span> : null}
                {book.rentalDaysLeft != null ? (
                  <span className="text-xs text-muted">{book.rentalDaysLeft} rental days left</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
      {filtered.length === 0 ? <p className="text-sm text-muted">No books match this filter.</p> : null}
    </div>
  )
}
