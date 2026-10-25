import type { UserRole } from '../auth/profile.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { FOLLOW_PAGE_SIZE, followCursorFilter, isFollowCursor, nextFollowCursor, type FollowCursor } from './cursor.ts'
import { bioSchema, displayNameSchema } from './schemas.ts'
import type {
  FollowListEntry,
  FollowListProfile,
  FollowPage,
  ProfileFailure,
  ProfileResult,
  ProfileUpdate,
  PublicProfile,
} from './types.ts'
import { PROFILES_PUBLIC_SUMMARY_COLUMNS } from './profileColumns.ts'
import { parseWebsite } from './website.ts'

const PUBLIC_PROFILE_COLUMNS = PROFILES_PUBLIC_SUMMARY_COLUMNS

const LIST_PROFILE_COLUMNS = 'id, username, display_name, avatar_url, verified, country'

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

function fail(
  code: ProfileFailure['error']['code'],
  message: string,
  error?: { code?: string; status?: number },
): ProfileFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function bool(value: unknown): boolean {
  return value === true
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function parsePublicProfile(value: unknown): PublicProfile | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = text(row.id)
  const username = text(row.username)
  const role = text(row.role)
  const createdAt = text(row.created_at)
  if (!id || !username || !createdAt) return null
  if (role !== 'reader' && role !== 'writer' && role !== 'founder') return null
  return {
    id,
    username,
    displayName: text(row.display_name) ?? '',
    bio: text(row.bio) ?? '',
    avatarUrl: text(row.avatar_url),
    bannerUrl: text(row.banner_url),
    website: text(row.website),
    country: text(row.country)?.trim() || null,
    city: text(row.city),
    cityVisible: bool(row.city_visible),
    language: text(row.language) ?? 'en',
    role: role as UserRole,
    verified: bool(row.verified),
    followerCount: count(row.follower_count),
    followingCount: count(row.following_count),
    creationCount: count(row.creation_count),
    createdAt,
    showLocalTime: bool(row.show_local_time),
    timezone: text(row.timezone) ?? 'UTC',
  }
}

function parseListProfile(value: unknown): FollowListProfile | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const record = row as Record<string, unknown>
  const id = text(record.id)
  const username = text(record.username)
  if (!id || !username) return null
  return {
    id,
    username,
    displayName: text(record.display_name) ?? '',
    avatarUrl: text(record.avatar_url),
    verified: bool(record.verified),
    country: text(record.country)?.trim().toUpperCase() || null,
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function getProfileByUsername(username: string): Promise<ProfileResult<PublicProfile>> {
  const normalized = username.trim().toLowerCase()
  if (!USERNAME_PATTERN.test(normalized)) {
    return fail('not_found', 'This profile does not exist.')
  }

  const { data, error } = await supabase
    .from('profiles_public')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('username', normalized)
    .maybeSingle()

  if (error) return fail('unavailable', 'We could not load this profile. Try again.', error)
  const profile = parsePublicProfile(data)
  if (!profile) return fail('not_found', 'This profile does not exist.')
  return { ok: true, data: profile }
}

function updatePayload(fields: ProfileUpdate): ProfileResult<ProfileUpdate> {
  const payload: ProfileUpdate = {}
  if (fields.display_name !== undefined) {
    const parsed = displayNameSchema.safeParse(fields.display_name)
    if (!parsed.success) return fail('invalid', parsed.error.issues[0]?.message ?? 'Enter a display name.')
    payload.display_name = parsed.data
  }
  if (fields.bio !== undefined) {
    const parsed = bioSchema.safeParse(fields.bio)
    if (!parsed.success) return fail('invalid', parsed.error.issues[0]?.message ?? 'That bio is too long.')
    payload.bio = parsed.data
  }
  if (fields.website !== undefined) {
    if (fields.website === null || fields.website.trim() === '') payload.website = null
    else {
      const parsed = parseWebsite(fields.website)
      if (!parsed.ok || !parsed.link) return fail('invalid', parsed.ok ? 'Enter a web address.' : parsed.message)
      payload.website = parsed.link.href
    }
  }
  if (fields.country !== undefined) {
    if (fields.country === null || fields.country.trim() === '') payload.country = null
    else {
      const country = fields.country.trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(country)) return fail('invalid', 'Choose a country.')
      payload.country = country
    }
  }
  if (fields.city !== undefined) {
    const city = fields.city?.trim() ?? ''
    if (city.length > 80) return fail('invalid', 'Use 80 characters or fewer.')
    payload.city = city || null
  }
  if (fields.city_visible !== undefined) payload.city_visible = fields.city_visible
  if (fields.language !== undefined) {
    if (!/^[a-z]{2,8}$/.test(fields.language)) return fail('invalid', 'Choose a language.')
    payload.language = fields.language
  }
  if (fields.who_can_message !== undefined) {
    if (
      fields.who_can_message !== 'everyone' &&
      fields.who_can_message !== 'followers' &&
      fields.who_can_message !== 'subscribers'
    ) {
      return fail('invalid', 'Choose who can message you.')
    }
    payload.who_can_message = fields.who_can_message
  }
  if (fields.avatar_url !== undefined) payload.avatar_url = fields.avatar_url
  if (fields.banner_url !== undefined) payload.banner_url = fields.banner_url
  return { ok: true, data: payload }
}

export async function updateOwnProfile(fields: ProfileUpdate): Promise<ProfileResult<PublicProfile>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to save your profile.')
  const payload = updatePayload(fields)
  if (!payload.ok) return payload
  if (Object.keys(payload.data).length === 0) return fail('invalid', 'There is nothing to save.')

  const { error: updateError } = await supabase.from('profiles').update(payload.data).eq('id', userId)
  if (updateError) return fail('unavailable', 'We could not save your profile. Try again.')

  const { data, error } = await supabase
    .from('profiles_public')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return fail('unavailable', 'We could not save your profile. Try again.', error ?? undefined)
  const profile = parsePublicProfile(data)
  if (!profile) return fail('unavailable', 'We could not save your profile. Try again.')
  return { ok: true, data: profile }
}

export async function followUser(id: string): Promise<ProfileResult<true>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to follow this person.')
  if (userId === id) return fail('self_follow', 'You cannot follow yourself.')

  const { error } = await supabase.from('follows').insert({ follower_id: userId, followee_id: id })
  if (!error) return { ok: true, data: true }
  if (error.code === '23505') return { ok: true, data: true }
  if (error.code === '23514') return fail('self_follow', 'You cannot follow yourself.')
  return fail('forbidden', 'You cannot follow this person.', error)
}

export async function unfollowUser(id: string): Promise<ProfileResult<true>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to unfollow this person.')

  const { error } = await supabase.from('follows').delete().eq('follower_id', userId).eq('followee_id', id)
  if (error) return fail('unavailable', 'We could not unfollow this person. Try again.', error)
  return { ok: true, data: true }
}

export async function isFollowing(id: string): Promise<ProfileResult<boolean>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to check this follow.')
  if (userId === id) return { ok: true, data: false }

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('followee_id', id)
    .maybeSingle()

  if (error) return fail('unavailable', 'We could not check this follow. Try again.', error)
  return { ok: true, data: Boolean(data) }
}

async function followingSet(ids: string[], userId: string | null): Promise<ProfileResult<Set<string>>> {
  if (!userId || ids.length === 0) return { ok: true, data: new Set() }
  const { data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', userId).in('followee_id', ids)
  if (error) return fail('unavailable', 'We could not load follows. Try again.', error)
  return { ok: true, data: new Set((data ?? []).map((row) => row.followee_id)) }
}

async function listFollows(
  userId: string,
  cursor: FollowCursor | null,
  direction: 'followers' | 'following',
): Promise<ProfileResult<FollowPage>> {
  if (cursor && !isFollowCursor(cursor)) return fail('invalid', 'We could not load the next page.')
  const idColumn = direction === 'followers' ? 'follower_id' : 'followee_id'
  const profileKey = direction === 'followers' ? 'follows_follower_id_fkey' : 'follows_followee_id_fkey'
  const filter = followCursorFilter(cursor, idColumn)

  let query = supabase
    .from('follows')
    .select(`created_at, follower_id, followee_id, profile:profiles!${profileKey}(${LIST_PROFILE_COLUMNS})`)
    .order('created_at', { ascending: false })
    .order(idColumn, { ascending: false })
    .limit(FOLLOW_PAGE_SIZE + 1)

  query = direction === 'followers' ? query.eq('followee_id', userId) : query.eq('follower_id', userId)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) return fail('unavailable', 'We could not load this list. Try again.', error)

  const rows = (data ?? []).map((row) => {
    const record = row as Record<string, unknown>
    const edgeId = text(record[idColumn]) ?? ''
    return {
      createdAt: text(record.created_at) ?? '',
      id: edgeId,
      profile: parseListProfile(record.profile),
    }
  })

  const { page, nextCursor } = nextFollowCursor(rows)
  const me = await currentUserId()
  const followed = await followingSet(
    page.flatMap((row) => (row.profile ? [row.profile.id] : [])),
    me,
  )
  if (!followed.ok) return followed

  const entries: FollowListEntry[] = page.flatMap((row) => {
    if (!row.profile) return []
    return [
      {
        createdAt: row.createdAt,
        id: row.id,
        profile: row.profile,
        following: followed.data.has(row.profile.id),
        isSelf: row.profile.id === me,
      },
    ]
  })

  return { ok: true, data: { entries, nextCursor } }
}

export function listFollowers(userId: string, cursor: FollowCursor | null = null): Promise<ProfileResult<FollowPage>> {
  return listFollows(userId, cursor, 'followers')
}

export function listFollowing(userId: string, cursor: FollowCursor | null = null): Promise<ProfileResult<FollowPage>> {
  return listFollows(userId, cursor, 'following')
}
