import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { badgeMeta } from './badgeMeta.ts'
import { nextPinPosition, validatePinAction, validatePinPosition } from './pinValidation.ts'
import type {
  BadgeFailure,
  BadgeProgressRow,
  BadgeResult,
  FeedBadge,
  PinnedBadge,
  UserBadgePublic,
} from './types.ts'

function fail(
  code: BadgeFailure['error']['code'],
  message: string,
  error?: { code?: string; status?: number },
): BadgeFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function parseProgressRow(value: unknown): BadgeProgressRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const key = text(row.key)
  if (!key) return null
  const current = typeof row.current === 'number' && Number.isFinite(row.current) ? row.current : 0
  const goal = typeof row.goal === 'number' && Number.isFinite(row.goal) ? row.goal : 0
  return { key, current, goal, earned: row.earned === true }
}

function parseUserBadgePublic(value: unknown): UserBadgePublic | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const badgeKey = text(row.badge_key) ?? text(row.badgeKey) ?? text(row.key)
  if (!badgeKey) return null
  const iconKey = text(row.icon_key) ?? text(row.iconKey) ?? badgeMeta(badgeKey).iconKey
  const meta = badgeMeta(badgeKey)
  return {
    badgeKey,
    iconKey,
    name: text(row.name) ?? meta.name,
    description: text(row.description) ?? meta.description,
    earnedAt: text(row.earned_at) ?? text(row.earnedAt),
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** Fire-and-forget month close for signed-in users visiting profiles. */
export async function tryClosePastMonths(): Promise<void> {
  const userId = await currentUserId()
  if (!userId) return
  await supabase.rpc('try_close_past_months')
}

export async function closeMonth(month: string): Promise<BadgeResult<null>> {
  const { error } = await supabase.rpc('close_month', { p_month: month })
  if (error) return fail('unavailable', error.message ?? 'Could not close the month.', error)
  return { ok: true, data: null }
}

export async function awardFeaturedBadge(userId: string): Promise<BadgeResult<null>> {
  const { error } = await supabase.rpc('award_featured_badge', { p_user: userId })
  if (error) return fail('unavailable', error.message ?? 'Could not award Featured.', error)
  return { ok: true, data: null }
}

export async function removeFeaturedBadge(userId: string): Promise<BadgeResult<null>> {
  const { error } = await supabase.rpc('remove_featured_badge', { p_user: userId })
  if (error) return fail('unavailable', error.message ?? 'Could not remove Featured.', error)
  return { ok: true, data: null }
}

export async function badgeProgressForUser(userId: string): Promise<BadgeResult<BadgeProgressRow[]>> {
  const { data, error } = await supabase.rpc('badge_progress_for_user', { p_user: userId })
  if (error) return fail('unavailable', 'We could not load badge progress. Try again.', error)
  const rows = Array.isArray(data) ? data.flatMap((row) => (parseProgressRow(row) ? [parseProgressRow(row)!] : [])) : []
  return { ok: true, data: rows }
}

export async function listUserBadgesPublic(userId: string): Promise<BadgeResult<UserBadgePublic[]>> {
  const { data, error } = await supabase.rpc('list_user_badges_public', { p_user: userId })
  if (error) {
    const { data: viewData, error: viewError } = await supabase
      .from('user_badges_public')
      .select('badge_key, icon_key, name, description, earned_at')
      .eq('user_id', userId)
    if (viewError) return fail('unavailable', 'We could not load badges. Try again.', viewError)
    const parsed = (viewData ?? []).flatMap((row) => {
      const badge = parseUserBadgePublic(row as unknown)
      return badge ? [badge] : []
    })
    return { ok: true, data: parsed }
  }
  const rows = Array.isArray(data) ? data.flatMap((row) => (parseUserBadgePublic(row) ? [parseUserBadgePublic(row)!] : [])) : []
  return { ok: true, data: rows }
}

export async function listPinnedBadges(userId: string): Promise<BadgeResult<PinnedBadge[]>> {
  const { data, error } = await supabase
    .from('user_pinned_badges')
    .select('badge_key, position, badges(name, icon_key)')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) return fail('unavailable', 'We could not load pinned badges. Try again.', error)

  const rows: PinnedBadge[] = (data ?? []).flatMap((raw) => {
    const row = raw as unknown as Record<string, unknown>
    const badgeKey = text(row.badge_key)
    const position = row.position
    if (!badgeKey || typeof position !== 'number') return []
    const embed = row.badges
    const embedRow = embed && typeof embed === 'object' ? (embed as Record<string, unknown>) : null
    const meta = badgeMeta(badgeKey)
    return [
      {
        badgeKey,
        position,
        iconKey: text(embedRow?.icon_key) ?? meta.iconKey,
        name: text(embedRow?.name) ?? meta.name,
      },
    ]
  })
  return { ok: true, data: rows }
}

export async function pinBadge(badgeKey: string, position?: number): Promise<BadgeResult<null>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in to pin badges.')

  const pinned = await listPinnedBadges(userId)
  if (!pinned.ok) return pinned
  const keys = pinned.data.map((row) => row.badgeKey)
  const validation = validatePinAction(keys, badgeKey, 'pin')
  if (!validation.ok) return fail('invalid', validation.message)

  const slot = position ?? nextPinPosition(keys)
  const slotCheck = validatePinPosition(slot)
  if (!slotCheck.ok) return fail('invalid', slotCheck.message)

  const { error } = await supabase.rpc('pin_badge', { p_badge_key: badgeKey, p_position: slot })
  if (error) return fail('unavailable', error.message ?? 'Could not pin that badge.', error)
  return { ok: true, data: null }
}

export async function unpinBadge(badgeKey: string): Promise<BadgeResult<null>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in to unpin badges.')

  const pinned = await listPinnedBadges(userId)
  if (!pinned.ok) return pinned
  const validation = validatePinAction(
    pinned.data.map((row) => row.badgeKey),
    badgeKey,
    'unpin',
  )
  if (!validation.ok) return fail('invalid', validation.message)

  const { error } = await supabase.rpc('unpin_badge', { p_badge_key: badgeKey })
  if (error) return fail('unavailable', error.message ?? 'Could not unpin that badge.', error)
  return { ok: true, data: null }
}

export async function feedBadgesByUserIds(userIds: readonly string[]): Promise<BadgeResult<Map<string, FeedBadge[]>>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  const map = new Map<string, FeedBadge[]>()
  if (unique.length === 0) return { ok: true, data: map }

  const { data, error } = await supabase
    .from('profile_feed_badges')
    .select('user_id, badge_key, icon_key, sort_order')
    .in('user_id', unique)

  if (error) return fail('unavailable', 'We could not load badges. Try again.', error)

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>
    const userId = text(record.user_id)
    const badgeKey = text(record.badge_key)
    if (!userId || !badgeKey) continue
    const iconKey = text(record.icon_key) ?? badgeMeta(badgeKey).iconKey
    const sortOrder = typeof record.sort_order === 'number' ? record.sort_order : 0
    const list = map.get(userId) ?? []
    list.push({ badgeKey, iconKey, sortOrder })
    map.set(userId, list)
  }
  return { ok: true, data: map }
}

export async function setFeaturedBook(bookId: string | null): Promise<BadgeResult<null>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in to choose a featured book.')
  const { error } = await supabase.rpc('set_featured_book', { p_book_id: bookId })
  if (error) return fail('unavailable', error.message ?? 'Could not update featured book.', error)
  return { ok: true, data: null }
}

export async function getFeaturedBookId(userId: string): Promise<BadgeResult<string | null>> {
  const { data, error } = await supabase
    .from('profile_featured_book')
    .select('book_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return fail('unavailable', 'We could not load featured book.', error)
  const bookId = data && typeof data === 'object' ? text((data as Record<string, unknown>).book_id) : null
  return { ok: true, data: bookId }
}
