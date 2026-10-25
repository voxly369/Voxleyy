import { supabase } from '../supabaseClient.ts'
import {
  founderInviteCodeFormSchema,
  founderInviteCodeRpcPayload,
  type FounderInviteCodeFormInput,
} from './inviteCodeFormSchema.ts'

export async function founderSetPlatformFlag(
  flag: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('founder_set_platform_flag', {
    p_flag: flag,
    p_enabled: enabled,
  })
  if (error) return { ok: false, message: error.message || 'Could not update that flag.' }
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
