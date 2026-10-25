import type { FeedBadge } from './types.ts'
import { MAX_FEED_BADGES } from './types.ts'

export function displayBadgesForFeed(badges: readonly FeedBadge[]): FeedBadge[] {
  return [...badges]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.badgeKey.localeCompare(b.badgeKey))
    .slice(0, MAX_FEED_BADGES)
}

/** Beside the name: Founder accounts use Founder + Verified badge slots; others use feed badges. */
export function displayBadgesBesideName(badges: readonly FeedBadge[], verified: boolean): FeedBadge[] {
  const founder = badges.find((badge) => badge.badgeKey === 'founder')
  if (!founder) return displayBadgesForFeed(badges)
  const slots: FeedBadge[] = [founder]
  if (verified) {
    slots.push({ badgeKey: 'verified', iconKey: 'verified', sortOrder: 9 })
  }
  return slots.slice(0, MAX_FEED_BADGES)
}

/** Coral Verified seal beside the name when not already shown in the Founder badge row. */
export function showsStandaloneVerifiedSeal(badges: readonly FeedBadge[], verified: boolean): boolean {
  if (!verified) return false
  return !displayBadgesBesideName(badges, verified).some((b) => b.badgeKey === 'verified')
}
