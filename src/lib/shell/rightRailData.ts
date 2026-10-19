import { listMyDraftsPage } from '../creations/api.ts'
import type { DraftListRow } from '../creations/types.ts'
import { supabase } from '../supabaseClient.ts'

async function viewerId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export type SuggestedWriter = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
}

export type RightRailWritersResult =
  | { ok: true; writers: SuggestedWriter[] }
  | { ok: false; message: string }

export type RightRailDraftsResult =
  | { ok: true; drafts: DraftListRow[] }
  | { ok: false; message: string }

export async function fetchSuggestedWriters(): Promise<RightRailWritersResult> {
  const userId = await viewerId()
  if (!userId) return { ok: true, writers: [] }

  const { data, error } = await supabase
    .from('profiles_public')
    .select('id, username, display_name, avatar_url, verified, follower_count')
    .eq('role', 'writer')
    .eq('status', 'active')
    .neq('id', userId)
    .order('follower_count', { ascending: false })
    .limit(20)

  if (error) return { ok: false, message: 'We could not load writers. Try again.' }

  const ids = (data ?? []).map((row) => row.id).filter((id): id is string => Boolean(id))
  const { data: follows, error: followError } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', userId)
    .in('followee_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

  if (followError) return { ok: false, message: 'We could not load writers. Try again.' }

  const following = new Set(
    (follows ?? []).flatMap((row) => (row.followee_id ? [row.followee_id] : [])),
  )
  const writers: SuggestedWriter[] = []
  for (const row of data ?? []) {
    if (!row.id || !row.username || following.has(row.id)) continue
    writers.push({
      id: row.id,
      username: row.username,
      displayName: row.display_name?.trim() || row.username,
      avatarUrl: row.avatar_url,
      verified: row.verified ?? false,
    })
    if (writers.length >= 5) break
  }

  return { ok: true, writers }
}

export async function fetchRecentOwnDrafts(): Promise<RightRailDraftsResult> {
  const result = await listMyDraftsPage(null)
  if (!result.ok) return { ok: false, message: result.error.message }
  const drafts = result.data.rows.filter((row) => !row.removed).slice(0, 3)
  return { ok: true, drafts }
}
