import { focusRing } from '../shell/navItems.ts'
import type { ImportedChapter } from '../../lib/books/importManuscript.ts'
import {
  deleteImportedChapter,
  mergeImportedChapterWithNext,
  renameImportedChapter,
  reorderImportedChapters,
  splitImportedChapter,
} from '../../lib/books/manuscriptImportEdit.ts'

type ManuscriptImportConfirmProps = {
  chapters: ImportedChapter[]
  busy?: boolean
  onChaptersChange: (chapters: ImportedChapter[]) => void
  onConfirm: () => void
  onCancel: () => void
}

export function ManuscriptImportConfirm({
  chapters,
  busy = false,
  onChaptersChange,
  onConfirm,
  onCancel,
}: ManuscriptImportConfirmProps) {
  return (
    <div className="flex flex-col gap-3" data-testid="manuscript-import-confirm">
      <p className="text-sm font-medium text-ink">{chapters.length} chapters ready to import</p>
      <ol className="flex max-h-64 flex-col gap-2 overflow-y-auto" aria-label="Detected chapters">
        {chapters.map((chapter, index) => (
          <li key={`${index}-${chapter.title}`} className="rounded-xl border border-line bg-bg p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="text-xs text-muted">Chapter title</span>
                <input
                  type="text"
                  value={chapter.title}
                  disabled={busy}
                  aria-label={`Chapter ${index + 1} title`}
                  onChange={(e) => onChaptersChange(renameImportedChapter(chapters, index, e.target.value))}
                  className="min-h-11 rounded-lg border border-line bg-surface px-3 text-ink"
                />
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  aria-label={`Move chapter ${index + 1} up`}
                  onClick={() => onChaptersChange(reorderImportedChapters(chapters, index, index - 1))}
                  className={`min-h-11 rounded-lg border border-line px-2 text-sm disabled:opacity-40 ${focusRing}`}
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={busy || index === chapters.length - 1}
                  aria-label={`Move chapter ${index + 1} down`}
                  onClick={() => onChaptersChange(reorderImportedChapters(chapters, index, index + 1))}
                  className={`min-h-11 rounded-lg border border-line px-2 text-sm disabled:opacity-40 ${focusRing}`}
                >
                  Down
                </button>
                <button
                  type="button"
                  disabled={busy || index >= chapters.length - 1}
                  onClick={() => onChaptersChange(mergeImportedChapterWithNext(chapters, index))}
                  className={`min-h-11 rounded-lg border border-line px-2 text-sm disabled:opacity-40 ${focusRing}`}
                >
                  Merge next
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onChaptersChange(splitImportedChapter(chapters, index))}
                  className={`min-h-11 rounded-lg border border-line px-2 text-sm ${focusRing}`}
                >
                  Split
                </button>
                <button
                  type="button"
                  disabled={busy || chapters.length <= 1}
                  onClick={() => onChaptersChange(deleteImportedChapter(chapters, index))}
                  className={`min-h-11 rounded-lg px-2 text-sm text-coral disabled:opacity-40 ${focusRing}`}
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted">{chapter.bodyText.slice(0, 160)}…</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || chapters.length === 0}
          onClick={onConfirm}
          className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] disabled:opacity-50 ${focusRing}`}
        >
          Import chapters
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className={`min-h-11 rounded-xl px-4 text-sm ${focusRing}`}>
          Back
        </button>
      </div>
    </div>
  )
}
