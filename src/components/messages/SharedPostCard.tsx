import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import type { SharedCreationPreview } from '../../lib/messages/types.ts'

type SharedPostCardProps = {
  preview: SharedCreationPreview
  className?: string
}

export function SharedPostCard({ preview, className = '' }: SharedPostCardProps) {
  const title = preview.title?.trim() || preview.caption?.trim() || 'Shared post'
  const byline = preview.authorDisplayName || preview.authorUsername
  return (
    <Link
      to={`/c/${preview.id}`}
      data-testid="shared-post-card"
      className={`block rounded-2xl border border-line bg-surface/80 p-3 text-left ${focusRing} ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Shared post</p>
      <p className="mt-1 font-medium text-ink">{title}</p>
      <p className="text-sm text-muted">by {byline}</p>
      {preview.excerpt ? <p className="mt-2 line-clamp-2 text-sm text-ink">{preview.excerpt}</p> : null}
    </Link>
  )
}
