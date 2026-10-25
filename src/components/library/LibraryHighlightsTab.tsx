import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { EmptyState } from '../states/EmptyState.tsx'
import { ErrorState } from '../states/ErrorState.tsx'
import { Skeleton } from '../states/Skeleton.tsx'
import { HIGHLIGHT_COLOURS, type HighlightColour } from '../../lib/reader/highlightSchema.ts'
import {
  listLibraryHighlights,
  type LibraryHighlightRow,
  type LibraryHighlightsCursor,
} from '../../lib/library/listLibraryHighlights.ts'
import { highlightColourClasses } from '../../lib/reader/highlightSegments.ts'
import { contentLangProps } from '../../lib/languages/dir.ts'

type LibraryHighlightsTabProps = {
  onOpenHighlight?: (row: LibraryHighlightRow) => void
}

export function LibraryHighlightsTab({ onOpenHighlight }: LibraryHighlightsTabProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<LibraryHighlightRow[]>([])
  const [cursor, setCursor] = useState<LibraryHighlightsCursor | null>(null)
  const [colour, setColour] = useState<HighlightColour | 'all'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const load = useCallback(
    async (nextCursor: LibraryHighlightsCursor | null, append: boolean) => {
      setLoading(true)
      setError(null)
      const result = await listLibraryHighlights({
        cursor: nextCursor,
        colour,
        search: debouncedSearch,
      })
      setLoading(false)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setRows((prev) => (append ? [...prev, ...result.rows] : result.rows))
      setCursor(result.nextCursor)
    },
    [colour, debouncedSearch],
  )

  useEffect(() => {
    void load(null, false)
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="library-highlight-search">
          Search highlights
        </label>
        <input
          id="library-highlight-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quote or note"
          className={`min-h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm ${focusRing}`}
        />
        <label className="sr-only" htmlFor="library-highlight-colour">
          Filter by colour
        </label>
        <select
          id="library-highlight-colour"
          value={colour}
          onChange={(e) => setColour(e.target.value as HighlightColour | 'all')}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 text-sm ${focusRing}`}
        >
          <option value="all">All colours</option>
          {HIGHLIGHT_COLOURS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {loading && rows.length === 0 ? <Skeleton variant="text-lines" lines={4} /> : null}
      {error ? <ErrorState title="Highlights did not load" message={error} onRetry={() => void load(null, false)} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No highlights yet" message="Select text in the reader and tap a colour to save a highlight." />
      ) : null}

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id}>
            <article className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {!row.isAvailable ? (
                  <span className="rounded-full bg-raised px-2 py-0.5 font-medium text-ink">Unavailable</span>
                ) : row.textChanged ? (
                  <span className="rounded-full bg-raised px-2 py-0.5 font-medium text-ink">Text changed</span>
                ) : null}
                <span className={`rounded-sm px-1 ${highlightColourClasses(row.colour)}`}>{row.colour}</span>
              </div>
              <p className="mt-2 font-serif text-ink line-clamp-3" {...contentLangProps(undefined)}>
                {row.quote}
              </p>
              {row.note ? <p className="mt-2 text-sm text-muted line-clamp-2">{row.note}</p> : null}
              <p className="mt-2 text-sm text-muted">
                {row.title?.trim() || 'Untitled'}
                {row.chapterTitle ? ` · ${row.chapterTitle}` : ''}
                {row.authorUsername ? ` · @${row.authorUsername}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.isAvailable ? (
                  <Link
                    to={
                      row.chapterId
                        ? `/read/book/${row.creationId}/${row.chapterId}`
                        : `/read/${row.creationId}`
                    }
                    className={`inline-flex min-h-11 items-center text-sm font-medium text-coral ${focusRing}`}
                    onClick={() => onOpenHighlight?.(row)}
                  >
                    Open in reader
                  </Link>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>

      {cursor ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(cursor, true)}
          className={`min-h-11 text-sm font-medium text-coral disabled:opacity-50 ${focusRing}`}
        >
          Load more
        </button>
      ) : null}
    </div>
  )
}
