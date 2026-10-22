import { Link } from 'react-router-dom'
import type { PinnedBadge } from '../../lib/badges/types.ts'
import { BadgeIcon } from '../badges/BadgeIcon.tsx'
import { focusRing } from '../shell/navItems.ts'

type BadgeShelfProps = {
  username: string
  pinned: readonly PinnedBadge[]
  loading?: boolean
}

export function BadgeShelf({ username, pinned, loading }: BadgeShelfProps) {
  if (loading) {
    return (
      <div className="px-5" aria-busy="true" data-testid="badge-shelf">
        <p className="text-sm text-muted">Loading badges…</p>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-2 px-5" aria-labelledby="profile-badge-shelf-heading" data-testid="badge-shelf">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="profile-badge-shelf-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Badges
        </h2>
        <Link
          to={`/u/${username}/badges`}
          className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}
          data-testid="badge-shelf-see-all"
        >
          See all
        </Link>
      </div>
      {pinned.length === 0 ? (
        <p className="text-sm text-muted">No pinned badges yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {pinned.map((badge) => (
            <li key={badge.badgeKey} className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
              <BadgeIcon badgeKey={badge.badgeKey} iconKey={badge.iconKey} size="md" />
              <span className="text-sm font-medium text-ink">{badge.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
