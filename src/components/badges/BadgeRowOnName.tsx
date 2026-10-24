import { displayBadgesBesideName } from '../../lib/badges/displayBadgesForFeed.ts'
import type { FeedBadge } from '../../lib/badges/types.ts'
import { BadgeIcon } from './BadgeIcon.tsx'

type BadgeRowOnNameProps = {
  badges: readonly FeedBadge[]
  verified?: boolean
  className?: string
}

export function BadgeRowOnName({ badges, verified = false, className = '' }: BadgeRowOnNameProps) {
  const visible = displayBadgesBesideName(badges, verified)
  if (visible.length === 0) return null
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} data-testid="badge-row-on-name">
      {visible.map((badge) => (
        <BadgeIcon key={badge.badgeKey} badgeKey={badge.badgeKey} iconKey={badge.iconKey} size="sm" />
      ))}
    </span>
  )
}
