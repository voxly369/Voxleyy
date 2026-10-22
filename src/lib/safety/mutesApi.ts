import { supabase } from '../supabaseClient.ts'
import { safetyFail } from './safetyFailure.ts'
import type { MuteRow, SafetyResult } from './types.ts'

export async function muteUser(mutedUserId: string): Promise<SafetyResult<null>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return safetyFail('forbidden', 'Sign in to mute someone.')
  if (mutedUserId === userId) return safetyFail('invalid', 'You cannot mute yourself.')

  const { error } = await supabase.from('mutes').insert({ user_id: userId, muted_user_id: mutedUserId })
  if (error?.code === '23505') return { ok: true, data: null }
  if (error) return safetyFail('unavailable', 'We could not mute this account. Try again.', error)
  return { ok: true, data: null }
}

export async function unmuteUser(mutedUserId: string): Promise<SafetyResult<null>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return safetyFail('forbidden', 'Sign in to manage mutes.')

  const { error } = await supabase.from('mutes').delete().eq('user_id', userId).eq('muted_user_id', mutedUserId)
  if (error) return safetyFail('unavailable', 'We could not unmute this account. Try again.', error)
  return { ok: true, data: null }
}

export async function listMutes(): Promise<SafetyResult<MuteRow[]>> {
  const { data, error } = await supabase
    .from('mutes')
    .select('muted_user_id, created_at, profile:profiles_public!mutes_muted_user_id_fkey(username, display_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (error) return safetyFail('unavailable', 'We could not load muted accounts. Try again.', error)

  const rows: MuteRow[] = (data ?? []).flatMap((row) => {
    const profile = row.profile as { username?: string; display_name?: string; avatar_url?: string | null } | null
    if (!row.muted_user_id || !row.created_at || !profile?.username) return []
    return [
      {
        mutedUserId: row.muted_user_id,
        createdAt: row.created_at,
        username: profile.username,
        displayName: profile.display_name ?? profile.username,
        avatarUrl: profile.avatar_url ?? null,
      },
    ]
  })
  return { ok: true, data: rows }
}
