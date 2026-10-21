import { Link } from 'react-router-dom'
import { CoverFrame } from '../creations/CoverFrame.tsx'
import { creationTypeLabel } from '../../lib/creations/creationTypeLabel.ts'
import { isReaderEligibleType } from '../../lib/reader/readerEligible.ts'
import type { LibraryItem } from '../../lib/library/types.ts'
import { focusRing } from '../shell/navItems.ts'
import { UnavailableLibraryCard } from './UnavailableLibraryCard.tsx'

type LibraryItemCardProps = {
  item: LibraryItem
  onRemove?: () => void
  progressLabel?: string
}

export function LibraryItemCard({ item, onRemove, progressLabel }: LibraryItemCardProps) {
  if (!item.isAvailable) {
    return <UnavailableLibraryCard onRemove={() => onRemove?.()} />
  }

  const href =
    item.type && isReaderEligibleType(item.type) ? `/read/${item.creationId}` : `/c/${item.creationId}`
  const title = item.title?.trim() || item.caption?.trim() || 'Untitled'

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-3">
        <Link to={href} className={`flex min-w-0 flex-1 gap-3 ${focusRing}`}>
          {item.coverUrl ? (
            <CoverFrame src={item.coverUrl} alt="" className="w-32 shrink-0" />
          ) : (
            <div className="flex h-[4.5rem] w-32 shrink-0 items-center justify-center rounded-xl bg-raised text-sm text-muted">
              {item.type ? creationTypeLabel(item.type) : 'Post'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg text-ink line-clamp-2">{title}</h3>
            {item.author ? (
              <p className="mt-1 text-sm text-muted">@{item.author.username}</p>
            ) : null}
            {progressLabel ? <p className="mt-2 text-sm font-medium text-coral">{progressLabel}</p> : null}
            {item.bodyExcerpt ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted">{item.bodyExcerpt}</p>
            ) : null}
          </div>
        </Link>
        {onRemove ? (
          <button
            type="button"
            aria-label="Remove"
            onClick={onRemove}
            className={`min-h-11 shrink-0 self-start rounded-xl px-3 text-sm font-medium text-coral ${focusRing}`}
          >
            Remove
          </button>
        ) : null}
      </div>
    </article>
  )
}
