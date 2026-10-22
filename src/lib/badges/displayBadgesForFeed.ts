import type { FeedBadge } from './types.ts'
import { MAX_FEED_BADGES } from './types.ts'

export function displayBadgesForFeed(badges: readonly FeedBadge[]): FeedBadge[] {
  return [...badges]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.badgeKey.localeCompare(b.badgeKey))
    .slice(0, MAX_FEED_BADGES)
}
