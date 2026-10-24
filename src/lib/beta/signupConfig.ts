import { supabase } from '../supabaseClient.ts'
import { inviteCodeFormatError, normalizeInviteCode } from './inviteCode.ts'

export type BetaSignupConfig = {
  signups_open: boolean
  invite_only: boolean
  waitlist_open: boolean
  closed_message: string | null
}

const DEFAULT_CONFIG: BetaSignupConfig = {
  signups_open: true,
  invite_only: false,
  waitlist_open: false,
  closed_message: null,
}

function parseConfig(data: unknown): BetaSignupConfig {
  if (!data || typeof data !== 'object') return DEFAULT_CONFIG
  const row = data as Record<string, unknown>
  return {
    signups_open: row.signups_open !== false,
    invite_only: row.invite_only === true,
    waitlist_open: row.waitlist_open === true,
    closed_message: typeof row.closed_message === 'string' ? row.closed_message : null,
  }
}

export async function fetchBetaSignupConfig(): Promise<BetaSignupConfig> {
  const { data, error } = await supabase.rpc('get_beta_signup_config')
  if (error) return DEFAULT_CONFIG
  return parseConfig(data)
}

export async function joinBetaWaitlist(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('join_beta_waitlist', { p_email: email.trim() })
  if (error) return { ok: false, message: 'We could not add you to the waitlist. Try again in a moment.' }
  return { ok: true }
}

export async function redeemInviteCode(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const formatError = inviteCodeFormatError(code)
  if (formatError) return { ok: false, message: formatError }
  const normalized = normalizeInviteCode(code)
  const { error } = await supabase.rpc('redeem_invite_code', { p_code: normalized })
  if (error) return { ok: false, message: 'That invite code is not valid or has already been used.' }
  return { ok: true }
}
