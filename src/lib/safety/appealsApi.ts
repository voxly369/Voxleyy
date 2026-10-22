import { supabase } from '../supabaseClient.ts'
import { safetyFail } from './safetyFailure.ts'
import type { AppealRow, SafetyResult } from './types.ts'

const APPEAL_MAX = 500

export async function submitAppeal(
  moderationActionId: string,
  message: string,
): Promise<SafetyResult<{ id: string }>> {
  const trimmed = message.trim()
  if (trimmed.length < 1 || trimmed.length > APPEAL_MAX) {
    return safetyFail('invalid', `Appeal message must be between 1 and ${APPEAL_MAX} characters.`)
  }

  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return safetyFail('forbidden', 'Sign in to submit an appeal.')

  const { data, error } = await supabase
    .from('appeals')
    .insert({ user_id: userId, moderation_action_id: moderationActionId, message: trimmed })
    .select('id')
    .maybeSingle()

  if (error) {
    const msg = error.message ?? 'We could not submit your appeal. Try again.'
    return safetyFail('unavailable', msg, error)
  }
  if (!data?.id) return safetyFail('unavailable', 'We could not submit your appeal. Try again.')
  return { ok: true, data: { id: data.id } }
}

export async function listMyAppeals(): Promise<SafetyResult<AppealRow[]>> {
  const { data, error } = await supabase
    .from('appeals')
    .select('id, message, status, decision, created_at, decided_at, moderation_action_id')
    .order('created_at', { ascending: false })

  if (error) return safetyFail('unavailable', 'We could not load your appeals. Try again.', error)

  const rows: AppealRow[] = (data ?? []).flatMap((row) => {
    if (!row.id || !row.message || !row.status || !row.created_at || !row.moderation_action_id) return []
    return [
      {
        id: row.id,
        message: row.message,
        status: row.status,
        decision: row.decision ?? null,
        createdAt: row.created_at,
        decidedAt: row.decided_at ?? null,
        moderationActionId: row.moderation_action_id,
      },
    ]
  })
  return { ok: true, data: rows }
}
