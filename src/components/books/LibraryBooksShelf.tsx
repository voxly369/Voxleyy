import { Link } from 'react-router-dom'
import { CoverFrame } from '../creations/CoverFrame.tsx'
import { focusRing } from '../shell/navItems.ts'
import type { LibraryBookRow } from '../../lib/books/bookSchema.ts'

type LibraryBooksShelfProps = {
  books: LibraryBookRow[]
}

export function LibraryBooksShelf({ books }: LibraryBooksShelfProps) {
  if (books.length === 0) {
    return (
      <p className="text-sm text-muted" data-testid="library-books-empty">
        Books you add or buy will appear here.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="library-books-shelf">
      {books.map((book) => (
        <li key={book.bookId}>
          <Link
            to={`/books/${book.bookId}`}
            className={`flex min-h-11 gap-3 rounded-2xl border border-line bg-surface p-3 ${focusRing}`}
          >
            {book.coverUrl ? (
              <div className="w-28 shrink-0">
                <CoverFrame src={book.coverUrl} alt="" label="" className="aspect-[2/3] rounded-lg" />
              </div>
            ) : (
              <div className="flex w-28 shrink-0 items-center justify-center rounded-lg bg-bg text-xs text-muted">No cover</div>
            )}
            <span className="flex flex-col gap-1">
              <span className="font-serif text-lg text-ink">{book.title}</span>
              <span className="text-sm text-muted">
                {book.authorDisplayName || book.authorUsername} · {book.readingStatus}
              </span>
              {book.percent > 0 ? <span className="text-xs text-muted">{Math.round(book.percent)}% read</span> : null}
              {book.rentalDaysLeft != null ? (
                <span className="text-xs text-muted">{book.rentalDaysLeft} rental days left</span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
