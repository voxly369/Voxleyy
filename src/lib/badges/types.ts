export type BadgeKey = string

export type BadgeCatalogRow = {
  key: BadgeKey
  name: string
  description: string
  iconKey: string
  sortOrder: number
}

export type UserBadgePublic = {
  badgeKey: BadgeKey
  iconKey: string
  name: string
  description: string
  earnedAt: string | null
}

export type BadgeProgressRow = {
  key: BadgeKey
  current: number
  goal: number
  earned: boolean
}

export type PinnedBadge = {
  badgeKey: BadgeKey
  iconKey: string
  name: string
  position: number
}

export type FeedBadge = {
  badgeKey: BadgeKey
  iconKey: string
  sortOrder: number
}

export type BadgeFailure = {
  ok: false
  error: {
    code: 'invalid' | 'forbidden' | 'not_found' | 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type BadgeResult<T> = { ok: true; data: T } | BadgeFailure

export const MAX_PINNED_BADGES = 3
export const MAX_FEED_BADGES = 2
