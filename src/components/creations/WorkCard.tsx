import { Link } from 'react-router-dom'
import { VerifiedBadge } from '../profile/VerifiedBadge.tsx'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import type { WorkSummary } from '../../lib/creations/types.ts'

type WorkCardProps = {
  work: WorkSummary
}

export function WorkCard({ work }: WorkCardProps) {
  const label = work.title?.trim() || work.caption?.trim() || 'Untitled'
  return (
    <Link
      to={`/c/${work.id}`}
      className="flex gap-3 rounded-lg border border-line bg-surface p-3 transition hover:border-coral/40"
    >
      <ImageWithFallback
        src={work.coverUrl ?? undefined}
        alt=""
        label={label.charAt(0)}
        className="size-14 rounded-md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-lg text-ink">{label}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <span className="truncate">{work.author.displayName || work.author.username}</span>
          {work.author.verified ? <VerifiedBadge /> : null}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted">
          {work.status === 'draft' ? 'Draft' : work.type.replace('_', ' ')}
        </p>
      </div>
    </Link>
  )
}
