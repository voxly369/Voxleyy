import { displayBadgesForFeed } from '../../lib/badges/displayBadgesForFeed.ts'
import type { FeedBadge } from '../../lib/badges/types.ts'
import { BadgeIcon } from './BadgeIcon.tsx'

type BadgeRowOnNameProps = {
  badges: readonly FeedBadge[]
  className?: string
}

export function BadgeRowOnName({ badges, className = '' }: BadgeRowOnNameProps) {
  const visible = displayBadgesForFeed(badges)
  if (visible.length === 0) return null
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} data-testid="badge-row-on-name">
      {visible.map((badge) => (
        <BadgeIcon key={badge.badgeKey} badgeKey={badge.badgeKey} iconKey={badge.iconKey} size="sm" />
      ))}
    </span>
  )
}
