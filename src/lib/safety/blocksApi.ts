import { supabase } from '../supabaseClient.ts'
import { safetyFail } from './safetyFailure.ts'
import type { BlockRow, SafetyResult } from './types.ts'

export async function blockUser(blockedId: string): Promise<SafetyResult<null>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return safetyFail('forbidden', 'Sign in to block someone.')
  if (blockedId === userId) return safetyFail('invalid', 'You cannot block yourself.')

  const { error } = await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: blockedId })
  if (error?.code === '23505') return { ok: true, data: null }
  if (error) return safetyFail('unavailable', 'We could not block this account. Try again.', error)
  return { ok: true, data: null }
}

export async function unblockUser(blockedId: string): Promise<SafetyResult<null>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return safetyFail('forbidden', 'Sign in to manage blocks.')

  const { error } = await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', blockedId)
  if (error) return safetyFail('unavailable', 'We could not unblock this account. Try again.', error)
  return { ok: true, data: null }
}

export async function listBlocks(): Promise<SafetyResult<BlockRow[]>> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, profile:profiles_public!blocks_blocked_id_fkey(username, display_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (error) return safetyFail('unavailable', 'We could not load blocked accounts. Try again.', error)

  const rows: BlockRow[] = (data ?? []).flatMap((row) => {
    const profile = row.profile as { username?: string; display_name?: string; avatar_url?: string | null } | null
    if (!row.blocked_id || !row.created_at || !profile?.username) return []
    return [
      {
        blockedId: row.blocked_id,
        createdAt: row.created_at,
        username: profile.username,
        displayName: profile.display_name ?? profile.username,
        avatarUrl: profile.avatar_url ?? null,
      },
    ]
  })
  return { ok: true, data: rows }
}
