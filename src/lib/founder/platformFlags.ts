import { supabase } from '../supabaseClient.ts'
import {
  founderPlatformFlagInputSchema,
  founderPlatformFlagRpcCalls,
  type FounderPlatformFlagKey,
} from './platformFlagSchema.ts'
import {
  founderInviteCodeFormSchema,
  founderInviteCodeRpcPayload,
  type FounderInviteCodeFormInput,
} from './inviteCodeFormSchema.ts'

async function loadPlatformSetting(key: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('platform_settings').select('value').eq('key', key).maybeSingle()
  if (error || !data?.value || typeof data.value !== 'object' || Array.isArray(data.value)) {
    return {}
  }
  return data.value as Record<string, unknown>
}

export async function founderSetPlatformFlag(
  flag: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = founderPlatformFlagInputSchema.safeParse({ flag, enabled })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid platform flag.' }
  }

  const [currentBeta, currentSignups] = await Promise.all([
    loadPlatformSetting('beta'),
    loadPlatformSetting('signups'),
  ])

  const calls = founderPlatformFlagRpcCalls(
    parsed.data.flag as FounderPlatformFlagKey,
    parsed.data.enabled,
    currentBeta,
    currentSignups,
  )

  for (const call of calls) {
    const { error } = await supabase.rpc('founder_set_platform_flag', {
      p_key: call.p_key,
      p_value: call.p_value,
      p_reason: call.p_reason,
    })
    if (error) return { ok: false, message: error.message || 'Could not update that flag.' }
  }

  return { ok: true }
}

export async function founderCreateInviteCode(
  input: FounderInviteCodeFormInput,
): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const parsed = founderInviteCodeFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid invite settings.' }
  }
  let payload: ReturnType<typeof founderInviteCodeRpcPayload>
  try {
    payload = founderInviteCodeRpcPayload(parsed.data)
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Invalid invite settings.' }
  }
  const { data, error } = await supabase.rpc('founder_create_invite_code', payload)
  if (error) return { ok: false, message: error.message || 'Could not create an invite code.' }
  const code = typeof data === 'string' ? data : (data as { code?: string } | null)?.code
  if (!code) return { ok: false, message: 'Invite code was not returned.' }
  return { ok: true, code }
}
