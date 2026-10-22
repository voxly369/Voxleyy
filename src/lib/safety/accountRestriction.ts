import { supabase } from '../supabaseClient.ts'
import { safetyFail } from './safetyFailure.ts'
import type { AccountRestriction, SafetyResult } from './types.ts'

export async function myAccountRestriction(): Promise<SafetyResult<AccountRestriction>> {
  const { data, error } = await supabase.rpc('my_account_restriction')
  if (error) return safetyFail('unavailable', 'We could not load your account status. Try again.', error)

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    return safetyFail('unavailable', 'We could not load your account status. Try again.')
  }

  const record = row as {
    status?: AccountRestriction['status']
    suspended_until?: string | null
    status_reason?: string | null
  }

  return {
    ok: true,
    data: {
      status: record.status ?? 'active',
      suspendedUntil: record.suspended_until ?? null,
      statusReason: record.status_reason ?? null,
    },
  }
}
