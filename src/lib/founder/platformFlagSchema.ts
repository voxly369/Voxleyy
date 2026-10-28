import { z } from 'zod'

export const founderPlatformFlagKeySchema = z.enum([
  'beta_signups_open',
  'beta_invite_only',
  'beta_waitlist_open',
])

export type FounderPlatformFlagKey = z.infer<typeof founderPlatformFlagKeySchema>

export const founderPlatformFlagInputSchema = z.object({
  flag: founderPlatformFlagKeySchema,
  enabled: z.boolean(),
})

export type FounderPlatformFlagInput = z.infer<typeof founderPlatformFlagInputSchema>

const BETA_JSON_FIELD: Record<FounderPlatformFlagKey, string> = {
  beta_signups_open: 'signups_open',
  beta_invite_only: 'invite_only',
  beta_waitlist_open: 'waitlist_open',
}

export function founderPlatformFlagReason(flag: FounderPlatformFlagKey, enabled: boolean): string {
  return `Founder set ${flag} to ${enabled ? 'on' : 'off'}`
}

/** Builds RPC args for founder_set_platform_flag (may return two calls for signups_open). */
export function founderPlatformFlagRpcCalls(
  flag: FounderPlatformFlagKey,
  enabled: boolean,
  currentBeta: Record<string, unknown>,
  currentSignups: Record<string, unknown>,
): { p_key: string; p_value: Record<string, unknown>; p_reason: string }[] {
  const reason = founderPlatformFlagReason(flag, enabled)
  const field = BETA_JSON_FIELD[flag]
  const nextBeta = { ...currentBeta, [field]: enabled }
  const calls: { p_key: string; p_value: Record<string, unknown>; p_reason: string }[] = [
    { p_key: 'beta', p_value: nextBeta, p_reason: reason },
  ]
  if (flag === 'beta_signups_open') {
    calls.push({ p_key: 'signups', p_value: { ...currentSignups, open: enabled }, p_reason: reason })
  }
  return calls
}
