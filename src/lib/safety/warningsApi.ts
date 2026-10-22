import { supabase } from '../supabaseClient.ts'
import { safetyFail } from './safetyFailure.ts'
import type { SafetyResult, WarningRow } from './types.ts'

export async function listUnseenWarnings(): Promise<SafetyResult<WarningRow[]>> {
  const { data, error } = await supabase
    .from('warnings')
    .select('id, message, created_at, seen_at')
    .is('seen_at', null)
    .order('created_at', { ascending: true })

  if (error) return safetyFail('unavailable', 'We could not load warnings. Try again.', error)

  const rows: WarningRow[] = (data ?? []).flatMap((row) => {
    if (!row.id || !row.message || !row.created_at) return []
    return [
      {
        id: row.id,
        message: row.message,
        createdAt: row.created_at,
        seenAt: row.seen_at ?? null,
      },
    ]
  })
  return { ok: true, data: rows }
}

export async function markWarningSeen(warningId: string): Promise<SafetyResult<null>> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('warnings').update({ seen_at: now }).eq('id', warningId)
  if (error) return safetyFail('unavailable', 'We could not update this warning. Try again.', error)
  return { ok: true, data: null }
}
