import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BookRecord } from '../../lib/books/bookSchema.ts'
import { focusRing } from '../shell/navItems.ts'
import { EmptyState } from '../states/EmptyState.tsx'

type StorefrontFilter = 'all' | 'books'

type ProfileStorefrontTabProps = {
  books: readonly BookRecord[]
  featuredBookId: string | null
  isOwn: boolean
  onSetFeatured?: (bookId: string) => void
}

export function ProfileStorefrontTab({ books, featuredBookId, isOwn, onSetFeatured }: ProfileStorefrontTabProps) {
  const [filter, setFilter] = useState<StorefrontFilter>('all')
  const published = useMemo(() => books.filter((b) => b.status === 'published' || b.status === 'draft'), [books])
  const filtered = filter === 'books' ? published : published
  const featured = featuredBookId ? published.find((b) => b.id === featuredBookId) ?? null : null
  const latest = [...filtered].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 12)

  return (
    <div className="flex flex-col gap-6" data-testid="profile-storefront-tab">
      <div className="flex gap-2" role="tablist" aria-label="Storefront filters">
        {(['all', 'books'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-11 rounded-2xl px-4 text-sm font-semibold ${filter === value ? 'bg-coral text-white' : 'bg-raised text-ink'} ${focusRing}`}
          >
            {value === 'all' ? 'All' : 'Books'}
          </button>
        ))}
      </div>

      {featured ? (
        <section aria-labelledby="featured-book-heading" className="flex flex-col gap-2">
          <h3 id="featured-book-heading" className="font-serif text-xl text-ink">
            Featured
          </h3>
          <Link
            to={`/books/${featured.id}`}
            className={`rounded-2xl border border-line bg-surface p-4 ${focusRing}`}
            data-testid="profile-featured-book"
          >
            <p className="font-semibold text-ink">{featured.title}</p>
            <p className="text-sm text-muted">{featured.status}</p>
          </Link>
        </section>
      ) : (
        <p className="text-sm text-muted">No featured book yet.</p>
      )}

      <section aria-labelledby="latest-storefront-heading" className="flex flex-col gap-2">
        <h3 id="latest-storefront-heading" className="font-serif text-xl text-ink">
          Latest
        </h3>
        {latest.length === 0 ? (
          <EmptyState title="Nothing listed yet" message="Published books and listings appear here." />
        ) : (
          <ul className="flex flex-col gap-2">
            {latest.map((book) => (
              <li key={book.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
                  <Link to={`/books/${book.id}`} className={`min-h-11 font-medium text-ink ${focusRing}`}>
                    {book.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">{book.status}</span>
                    {isOwn && onSetFeatured ? (
                      <button
                        type="button"
                        onClick={() => onSetFeatured(book.id)}
                        className={`text-sm font-semibold text-coral ${focusRing}`}
                      >
                        {featuredBookId === book.id ? 'Featured' : 'Feature'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
