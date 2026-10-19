import { Link } from 'react-router-dom'
import { VerifiedBadge } from '../profile/VerifiedBadge.tsx'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { audienceLabel } from '../../lib/creations/audienceOptions.ts'
import { creationTypeLabel } from '../../lib/creations/creationTypeLabel.ts'
import type { PublishedWorkSummary, WorkSummary } from '../../lib/creations/types.ts'

type WorkCardProps =
  | { work: WorkSummary; variant?: 'default' }
  | { work: PublishedWorkSummary; variant: 'published'; showAudience?: boolean }

export function WorkCard(props: WorkCardProps) {
  const { work } = props
  const label = work.title?.trim() || 'Untitled'

  if (props.variant === 'published') {
    const publishedWork = work as PublishedWorkSummary
    const published = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(publishedWork.publishedAt))
    return (
      <Link
        to={`/c/${publishedWork.id}`}
        className="flex gap-3 rounded-lg border border-line bg-surface transition supports-hover:border-coral/40"
      >
        <ImageWithFallback
          src={publishedWork.coverUrl ?? undefined}
          alt=""
          label={label.charAt(0)}
          className="size-14 rounded-md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg text-ink">{label}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted">{creationTypeLabel(publishedWork.type)}</p>
          {props.showAudience ? (
            <p className="mt-1 text-sm text-muted">{audienceLabel(publishedWork.audience)}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted">Published {published}</p>
        </div>
      </Link>
    )
  }

  const summary = work as WorkSummary
  const cardLabel = summary.title?.trim() || summary.caption?.trim() || 'Untitled'
  return (
    <Link
      to={`/c/${summary.id}`}
      className="flex gap-3 rounded-lg border border-line bg-surface p-3 transition supports-hover:border-coral/40"
    >
      <ImageWithFallback
        src={summary.coverUrl ?? undefined}
        alt=""
        label={cardLabel.charAt(0)}
        className="size-14 rounded-md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-lg text-ink">{cardLabel}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <span className="truncate">{summary.author.displayName || summary.author.username}</span>
          {summary.author.verified ? <VerifiedBadge /> : null}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted">
          {summary.status === 'draft' ? 'Draft' : summary.type.replace('_', ' ')}
        </p>
      </div>
    </Link>
  )
}
