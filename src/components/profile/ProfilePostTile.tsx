import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { CreationTypeIcon } from '../creations/CreationTypeIcon.tsx'
import { QuoteCardView } from '../creations/QuoteCardView.tsx'
import { focusRing } from '../shell/navItems.ts'
import { quoteStyleFromJson } from '../../lib/creations/bodyDocument.ts'
import { formatCountLabel } from '../../lib/formatCountLabel.ts'
import { wholeLineExcerpt } from '../../lib/creations/wholeLineExcerpt.ts'
import type { PublishedWorkSummary } from '../../lib/creations/types.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10

type ProfilePostTileProps = {
  work: PublishedWorkSummary
  saved: boolean
  saveBusy: boolean
  onToggleSave: (workId: string, currentlySaved: boolean) => void
}

export function ProfilePostTile({ work, saved, saveBusy, onToggleSave }: ProfilePostTileProps) {
  const pressTimer = useRef<number | null>(null)
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const pressActive = useRef(false)
  const longPressFired = useRef(false)
  const suppressNextClick = useRef(false)

  function clearPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    startPoint.current = null
    pressActive.current = false
    longPressFired.current = false
  }

  function onPointerDown(event: React.PointerEvent) {
    longPressFired.current = false
    clearPress()
    pressActive.current = true
    startPoint.current = { x: event.clientX, y: event.clientY }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // jsdom may not implement pointer capture
    }
    pressTimer.current = window.setTimeout(() => {
      if (!pressActive.current) return
      longPressFired.current = true
      suppressNextClick.current = true
      onToggleSave(work.id, saved)
    }, LONG_PRESS_MS)
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!startPoint.current) return
    const dx = Math.abs(event.clientX - startPoint.current.x)
    const dy = Math.abs(event.clientY - startPoint.current.y)
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
      pressActive.current = false
      clearPress()
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // jsdom may not implement pointer capture
    }
    clearPress()
  }

  function onLinkClick(event: React.MouseEvent) {
    if (suppressNextClick.current) {
      event.preventDefault()
      suppressNextClick.current = false
    }
  }

  function onContextMenu(event: React.MouseEvent) {
    if (longPressFired.current) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    onToggleSave(work.id, saved)
  }

  const excerptSource = work.bodyText ?? work.title ?? 'Work'
  const excerpt = wholeLineExcerpt(excerptSource, 6)

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div
        data-testid="profile-tile-press-surface"
        className="relative aspect-square w-full bg-bg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onScroll={clearPress}
        onContextMenu={onContextMenu}
      >
        <Link
          to={`/c/${work.id}`}
          onClick={onLinkClick}
          className={`absolute inset-0 flex flex-col ${focusRing}`}
          aria-label={work.title?.trim() || 'Open work'}
        >
          {work.type === 'quote_card' ? (
            <QuoteCardView
              text={work.bodyText ?? work.title ?? ''}
              style={quoteStyleFromJson(work.bodyJson)}
              className="h-full min-h-0 rounded-none text-base"
            />
          ) : work.coverUrl ? (
            <ImageWithFallback src={work.coverUrl} alt="" label="Cover" className="size-full object-cover" />
          ) : (
            <p className="h-[7.5rem] overflow-hidden whitespace-pre-wrap p-3 font-serif text-sm leading-normal text-ink">
              {excerpt.text}
            </p>
          )}
        </Link>
        <button
          type="button"
          aria-label={saved ? 'Remove from Library' : 'Save to Library'}
          disabled={saveBusy}
          onClick={() => onToggleSave(work.id, saved)}
          className={`absolute right-2 top-2 hidden min-h-11 min-w-11 items-center justify-center rounded-full bg-surface/90 px-2 text-xs font-semibold text-coral group-supports-hover:flex group-focus-within:flex ${focusRing}`}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center gap-2">
          <CreationTypeIcon type={work.type} className="size-4 shrink-0 text-muted" />
          <span className="truncate font-medium text-ink">{work.title?.trim() || 'Untitled'}</span>
        </div>
        <p className="text-xs text-muted">
          {formatCountLabel(work.likeCount, 'like')} · {formatCountLabel(work.commentCount, 'comment')}
        </p>
      </div>
    </article>
  )
}
