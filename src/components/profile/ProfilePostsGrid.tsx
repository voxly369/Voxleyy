import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreationTypeIcon } from '../creations/CreationTypeIcon.tsx'
import { QuoteCardView } from '../creations/QuoteCardView.tsx'
import { focusRing } from '../shell/navItems.ts'
import { useToast } from '../../lib/shell/useToast.ts'
import { quoteStyleFromJson } from '../../lib/creations/bodyDocument.ts'
import type { PublishedWorkSummary } from '../../lib/creations/types.ts'
import { toggleSave } from '../../lib/engagement/toggleSave.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'

type ProfilePostsGridProps = {
  works: PublishedWorkSummary[]
  viewerId: string | null
  profileUserId: string
  onLoadMore: () => void
  loadingMore: boolean
  hasMore: boolean
  loadMoreError: string | null
  onRetryLoadMore: () => void
}

export function ProfilePostsGrid({
  works,
  viewerId,
  profileUserId,
  onLoadMore,
  loadingMore,
  hasMore,
  loadMoreError,
  onRetryLoadMore,
}: ProfilePostsGridProps) {
  const { showToast } = useToast()
  const pressTimer = useRef<number | null>(null)
  const [saveBusy, setSaveBusy] = useState<string | null>(null)

  function clearPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  async function saveWork(workId: string, currentlySaved: boolean) {
    if (!viewerId) return
    if (viewerId === profileUserId) {
      showToast('You cannot save your own work to your Library.')
      return
    }
    setSaveBusy(workId)
    const result = await toggleSave(workId, currentlySaved)
    setSaveBusy(null)
    if (!result.ok) {
      showToast(result.error.message)
      return
    }
    if (result.saved) {
      showToast('Saved to your Library', {
        label: 'Undo',
        onClick: () => void toggleSave(workId, true),
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {works.map((work) => (
          <li key={work.id} className="group relative">
            <Link
              to={`/c/${work.id}`}
              className={`flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface ${focusRing}`}
              onPointerDown={() => {
                clearPress()
                pressTimer.current = window.setTimeout(() => {
                  void saveWork(work.id, false)
                }, 500)
              }}
              onPointerUp={clearPress}
              onPointerLeave={clearPress}
              onPointerCancel={clearPress}
              onContextMenu={(event) => {
                event.preventDefault()
                void saveWork(work.id, false)
              }}
            >
              <div className="relative aspect-square w-full bg-bg">
                {work.type === 'quote_card' ? (
                  <QuoteCardView
                    text={work.bodyText ?? work.title ?? ''}
                    style={quoteStyleFromJson(work.bodyJson)}
                    className="h-full min-h-0 rounded-none text-base"
                  />
                ) : work.coverUrl ? (
                  <ImageWithFallback src={work.coverUrl} alt="" label="Cover" className="size-full object-cover" />
                ) : (
                  <p className="line-clamp-6 p-3 font-serif text-sm text-ink">{work.bodyText ?? work.title ?? 'Work'}</p>
                )}
                <button
                  type="button"
                  aria-label="Save to Library"
                  disabled={saveBusy === work.id}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    void saveWork(work.id, false)
                  }}
                  className={`absolute right-2 top-2 hidden min-h-11 min-w-11 items-center justify-center rounded-full bg-surface/90 px-2 text-xs font-semibold text-coral group-hover:flex group-focus-within:flex ${focusRing}`}
                >
                  Save
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <div className="flex items-center gap-2">
                  <CreationTypeIcon type={work.type} className="size-4 shrink-0 text-muted" />
                  <span className="truncate font-medium text-ink">{work.title?.trim() || 'Untitled'}</span>
                </div>
                <p className="text-xs text-muted">
                  {work.likeCount} likes · {work.commentCount} comments
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {loadMoreError ? (
        <button type="button" onClick={onRetryLoadMore} className={`text-sm text-coral ${focusRing}`}>
          {loadMoreError} — Try again
        </button>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={onLoadMore}
          className={`min-h-11 self-center rounded-2xl border border-line px-4 text-base font-medium ${focusRing}`}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}
