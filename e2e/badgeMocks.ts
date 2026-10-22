/** E2E-only badge/streak/analytics fixtures — do not import from src/. */

export type E2ePinnedBadge = {
  badge_key: string
  position: number
  badges?: { name: string; icon_key: string }
}

export type E2eFeedBadgeRow = {
  user_id: string
  badge_key: string
  icon_key: string
  sort_order: number
}

let pinnedBadges: E2ePinnedBadge[] = [
  { badge_key: 'poet', position: 1, badges: { name: 'Poet', icon_key: 'quill' } },
]
let feedBadges: E2eFeedBadgeRow[] = [
  { user_id: '22222222-2222-2222-2222-222222222222', badge_key: 'poet', icon_key: 'quill', sort_order: 1 },
  { user_id: '22222222-2222-2222-2222-222222222222', badge_key: 'storyteller', icon_key: 'book-open', sort_order: 2 },
]
let streakRow: Record<string, unknown> | null = {
  user_id: '22222222-2222-2222-2222-222222222222',
  writing_current: 4,
  writing_longest: 10,
  writing_last_active_day: '2026-01-02',
  reading_current: 2,
  reading_longest: 5,
  reading_last_active_day: '2026-01-02',
}
let analyticsPayload: Record<string, unknown> | null = {
  views_7d: 12,
  views_30d: 40,
  likes_7d: 3,
  likes_30d: 9,
  saves_7d: 1,
  saves_30d: 4,
  comments_7d: 0,
  comments_30d: 2,
  followers_7d: 1,
  followers_30d: 3,
  best_piece: { id: '00000000-0000-0000-0000-000000000001', title: 'Readable creation', views: 12, likes: 3 },
}
let badgeProgress: Record<string, unknown>[] = [
  { key: 'poet', current: 5, goal: 5, earned: true },
  { key: 'storyteller', current: 2, goal: 5, earned: false },
]

export function resetBadgeMocks() {
  pinnedBadges = [{ badge_key: 'poet', position: 1, badges: { name: 'Poet', icon_key: 'quill' } }]
  feedBadges = [
    { user_id: '22222222-2222-2222-2222-222222222222', badge_key: 'poet', icon_key: 'quill', sort_order: 1 },
    { user_id: '22222222-2222-2222-2222-222222222222', badge_key: 'storyteller', icon_key: 'book-open', sort_order: 2 },
  ]
  streakRow = {
    user_id: '22222222-2222-2222-2222-222222222222',
    writing_current: 4,
    writing_longest: 10,
    writing_last_active_day: '2026-01-02',
    reading_current: 2,
    reading_longest: 5,
    reading_last_active_day: '2026-01-02',
  }
  analyticsPayload = {
    views_7d: 12,
    views_30d: 40,
    likes_7d: 3,
    likes_30d: 9,
    saves_7d: 1,
    saves_30d: 4,
    comments_7d: 0,
    comments_30d: 2,
    followers_7d: 1,
    followers_30d: 3,
    best_piece: { id: '00000000-0000-0000-0000-000000000001', title: 'Readable creation', views: 12, likes: 3 },
  }
  badgeProgress = [
    { key: 'poet', current: 5, goal: 5, earned: true },
    { key: 'storyteller', current: 2, goal: 5, earned: false },
  ]
}

export function setE2eAnalyticsEmpty() {
  analyticsPayload = {
    views_7d: 0,
    views_30d: 0,
    likes_7d: 0,
    likes_30d: 0,
    saves_7d: 0,
    saves_30d: 0,
    comments_7d: 0,
    comments_30d: 0,
    followers_7d: 0,
    followers_30d: 0,
    best_piece: null,
  }
}

export function badgeMockHandleRest(url: string, method: string, postData: unknown): unknown | undefined {
  if (url.includes('/rest/v1/rpc/try_close_past_months')) return null
  if (url.includes('/rest/v1/rpc/record_creation_view')) return null
  if (url.includes('/rest/v1/rpc/badge_progress_for_user')) return badgeProgress
  if (url.includes('/rest/v1/rpc/list_user_badges_public')) return [{ badge_key: 'poet', icon_key: 'quill', earned_at: '2026-01-01T00:00:00Z' }]
  if (url.includes('/rest/v1/rpc/get_creator_analytics')) return analyticsPayload
  if (url.includes('/rest/v1/rpc/pin_badge') || url.includes('/rest/v1/rpc/unpin_badge')) return null
  if (url.includes('/rest/v1/rpc/set_featured_book')) return null
  if (url.includes('/rest/v1/rpc/close_month')) return null
  if (url.includes('/rest/v1/rpc/award_featured_badge') || url.includes('/rest/v1/rpc/remove_featured_badge')) return null

  if (url.includes('/rest/v1/user_pinned_badges')) return pinnedBadges
  if (url.includes('/rest/v1/profile_feed_badges')) return feedBadges
  if (url.includes('/rest/v1/user_streaks')) {
    const idMatch = url.match(/user_id=eq\.([^&]+)/)
    const id = idMatch?.[1]
    if (!streakRow) return []
    if (!id || streakRow.user_id === id) return [streakRow]
    return []
  }
  if (url.includes('/rest/v1/profile_featured_book')) return []

  if (url.includes('/rest/v1/user_badges_public')) {
    return [{ user_id: '22222222-2222-2222-2222-222222222222', badge_key: 'poet', icon_key: 'quill', earned_at: '2026-01-01T00:00:00Z' }]
  }

  if (url.includes('/rest/v1/creation_view_events') && method === 'POST') return [postData]

  return undefined
}
