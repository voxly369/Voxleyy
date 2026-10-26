import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'

export function UnderReviewNotice() {
  return (
    <div
      data-testid="under-review-notice"
      role="status"
      className="rounded-2xl border border-line bg-raised/60 p-4 text-base text-ink"
    >
      <p className="font-semibold">This piece is under review</p>
      <p className="mt-1 text-sm text-muted">The Founder is reviewing reports on this post.</p>
    </div>
  )
}

export function AuthorAutoHiddenNotice({
  moderationActionId,
}: {
  moderationActionId: string | null
}) {
  const appealHref = moderationActionId
    ? `/settings/appeals?action=${encodeURIComponent(moderationActionId)}`
    : '/settings/appeals'

  return (
    <div
      data-testid="author-auto-hidden-notice"
      role="status"
      className="rounded-2xl border border-line bg-raised/60 p-4 text-base text-ink"
    >
      <p className="font-semibold">Hidden after reports</p>
      <p className="mt-1 text-sm text-muted">
        This post is hidden from everyone else while the Founder reviews it. You can still see it here.
      </p>
      <Link
        to={appealHref}
        className={`mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-coral ${focusRing}`}
      >
        Appeal
      </Link>
    </div>
  )
}
