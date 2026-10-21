import { useCallback, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import type { ChapterDetail } from '../../lib/books/chapterContentSchema.ts'
import { countWordsInPlainText } from '../../lib/books/wordCount.ts'

type ChapterManagerProps = {
  bookId: string
  chapters: ChapterDetail[]
  busy?: boolean
  onCreate: () => void
  onDelete: (chapterId: string) => void
  onReorder: (orderedIds: string[]) => void
  onToggleSample: (chapterId: string, isSample: boolean) => void
  onTogglePublish: (chapterId: string, publish: boolean) => void
}

export function ChapterManager({
  bookId,
  chapters,
  busy = false,
  onCreate,
  onDelete,
  onReorder,
  onToggleSample,
  onTogglePublish,
}: ChapterManagerProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)

  const reorderByIndex = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= chapters.length || to >= chapters.length) return
      const next = [...chapters]
      const [moved] = next.splice(from, 1)
      if (!moved) return
      next.splice(to, 0, moved)
      onReorder(next.map((c) => c.id))
    },
    [chapters, onReorder],
  )

  function onKeyDown(index: number, event: KeyboardEvent<HTMLLIElement>) {
    if (event.key === 'ArrowUp' && event.altKey) {
      event.preventDefault()
      reorderByIndex(index, index - 1)
      setFocusIndex(Math.max(0, index - 1))
    }
    if (event.key === 'ArrowDown' && event.altKey) {
      event.preventDefault()
      reorderByIndex(index, index + 1)
      setFocusIndex(Math.min(chapters.length - 1, index + 1))
    }
  }

  return (
    <section aria-labelledby="chapter-manager-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="chapter-manager-heading" className="font-serif text-xl text-ink">
          Chapters
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/books/${bookId}/preview`}
            className={`min-h-11 inline-flex items-center rounded-xl border border-line px-4 text-sm font-medium ${focusRing}`}
          >
            Preview book
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={onCreate}
            className={`min-h-11 rounded-xl bg-coral px-4 text-sm font-semibold text-[#1a100a] disabled:opacity-60 ${focusRing}`}
          >
            Add chapter
          </button>
        </div>
      </div>
      <p className="text-xs text-muted md:hidden">Use Move up/down to reorder chapters.</p>
      <p className="hidden text-xs text-muted md:block">Drag chapters to reorder, or use Alt+Arrow keys when focused.</p>
      {chapters.length === 0 ? (
        <p className="text-sm text-muted">Add a chapter or import a manuscript to get started.</p>
      ) : (
        <ol className="flex flex-col gap-2" data-testid="chapter-list">
          {chapters.map((chapter, index) => {
            const words = chapter.wordCount || countWordsInPlainText(chapter.bodyText ?? '')
            const published = chapter.status === 'published'
            return (
              <li
                key={chapter.id}
                tabIndex={focusIndex === index ? 0 : -1}
                draggable={!busy}
                onKeyDown={(e) => onKeyDown(index, e)}
                onFocus={() => setFocusIndex(index)}
                onDragStart={() => setDragId(chapter.id)}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (!dragId || dragId === chapter.id) return
                  const from = chapters.findIndex((c) => c.id === dragId)
                  const to = index
                  setDragId(null)
                  reorderByIndex(from, to)
                }}
                onDragEnd={() => setDragId(null)}
                className={`rounded-2xl border border-line bg-surface p-4 ${dragId === chapter.id ? 'opacity-70' : ''}`}
                data-testid={`chapter-row-${chapter.id}`}
                aria-grabbed={dragId === chapter.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">
                      Chapter {chapter.position}
                      <span className="hidden md:inline"> · drag handle</span>
                    </span>
                    <Link
                      to={`/books/${bookId}/builder/chapter/${chapter.id}`}
                      className={`font-serif text-lg text-ink ${focusRing}`}
                    >
                      {chapter.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {words} words · {chapter.status}
                      {chapter.isSample ? ' · Sample' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      aria-label={`Move ${chapter.title} up`}
                      onClick={() => reorderByIndex(index, index - 1)}
                      className={`min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === chapters.length - 1}
                      aria-label={`Move ${chapter.title} down`}
                      onClick={() => reorderByIndex(index, index + 1)}
                      className={`min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleSample(chapter.id, !chapter.isSample)}
                      className={`min-h-11 rounded-lg border border-line px-3 text-sm ${focusRing}`}
                    >
                      {chapter.isSample ? 'Unset sample' : 'Mark sample'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={published}
                      onClick={() => onTogglePublish(chapter.id, !published)}
                      className={`min-h-11 rounded-lg px-3 text-sm ${published ? 'border border-line' : `bg-coral font-semibold text-[#1a100a] ${focusRing}`}`}
                    >
                      {published ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link
                      to={`/books/${bookId}/preview/chapter/${chapter.id}`}
                      className={`min-h-11 inline-flex items-center rounded-lg border border-line px-3 text-sm ${focusRing}`}
                    >
                      Preview
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmId(chapter.id)}
                      className={`min-h-11 rounded-lg px-3 text-sm text-coral ${focusRing}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {confirmId === chapter.id ? (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-bg p-3">
                    <p className="w-full text-sm text-muted">Remove this chapter from the book?</p>
                    <button
                      type="button"
                      className={`min-h-11 rounded-lg bg-coral px-3 text-sm font-semibold text-[#1a100a] ${focusRing}`}
                      onClick={() => {
                        onDelete(chapter.id)
                        setConfirmId(null)
                      }}
                    >
                      Confirm remove
                    </button>
                    <button type="button" className={`min-h-11 rounded-lg px-3 text-sm ${focusRing}`} onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
