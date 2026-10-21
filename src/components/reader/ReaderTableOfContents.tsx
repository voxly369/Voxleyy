import type { TocEntry } from '../../lib/reader/toc.ts'
import { focusRing } from '../shell/navItems.ts'

type ReaderTableOfContentsProps = {
  entries: TocEntry[]
  onPick: (blockIndex: number) => void
  onClose: () => void
}

export function ReaderTableOfContents({ entries, onPick, onClose }: ReaderTableOfContentsProps) {
  if (entries.length === 0) return null
  return (
    <nav aria-label="Table of contents" className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-serif text-lg text-ink">Contents</h2>
        <button type="button" onClick={onClose} className={`min-h-11 min-w-11 text-sm text-muted ${focusRing}`}>
          Close
        </button>
      </div>
      <ol className="flex flex-col gap-1">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? 'pl-4' : ''}>
            <button
              type="button"
              onClick={() => onPick(entry.blockIndex)}
              className={`min-h-11 w-full rounded-lg px-2 text-left text-sm text-ink supports-hover:bg-raised ${focusRing}`}
            >
              {entry.text}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
