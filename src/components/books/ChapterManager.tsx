import { useState } from 'react'
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
  onMove: (chapterId: string, direction: 'up' | 'down') => void
  onToggleSample: (chapterId: string, isSample: boolean) => void
  onPublish: (chapterId: string) => void
}

export function ChapterManager({
  bookId,
  chapters,
  busy = false,
  onCreate,
  onDelete,
  onMove,
  onToggleSample,
  onPublish,
}: ChapterManagerProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <section aria-labelledby="chapter-manager-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="chapter-manager-heading" className="font-serif text-xl text-ink">
          Chapters
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onCreate}
          className={`min-h-11 rounded-xl bg-coral px-4 text-sm font-semibold text-[#1a100a] disabled:opacity-60 ${focusRing}`}
        >
          Add chapter
        </button>
      </div>
      {chapters.length === 0 ? (
        <p className="text-sm text-muted">Add a chapter or import a manuscript to get started.</p>
      ) : (
        <ol className="flex flex-col gap-2" data-testid="chapter-list">
          {chapters.map((chapter, index) => {
            const words = chapter.wordCount || countWordsInPlainText(chapter.bodyText ?? '')
            return (
              <li key={chapter.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Chapter {chapter.position}</span>
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
                      onClick={() => onMove(chapter.id, 'up')}
                      className={`min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === chapters.length - 1}
                      aria-label={`Move ${chapter.title} down`}
                      onClick={() => onMove(chapter.id, 'down')}
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
                    {chapter.status !== 'published' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onPublish(chapter.id)}
                        className={`min-h-11 rounded-lg bg-coral px-3 text-sm font-semibold text-[#1a100a] ${focusRing}`}
                      >
                        Publish
                      </button>
                    ) : null}
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
