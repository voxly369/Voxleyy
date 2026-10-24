import { supabase } from '../../supabaseClient.ts'
import {
  MFA_ENROLL_FAILED,
  MFA_REMOVE_FAILED,
  MFA_VERIFY_ENROLL_FAILED,
  MFA_CODE_INVALID,
} from './messages.ts'

export type TotpFactor = {
  id: string
  friendlyName: string | null
  status: string
}

export type EnrollTotpStart = {
  factorId: string
  secret: string
  uri: string
}

export type MfaActionResult = { ok: true } | { ok: false; message: string }

export async function listTotpFactors(): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error || !data) return []
  return (data.totp ?? []).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? null,
    status: factor.status,
  }))
}

export async function startTotpEnroll(friendlyName = 'Authenticator app'): Promise<
  | { ok: true; data: EnrollTotpStart }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  })
  if (error || !data?.totp?.secret || !data.totp.uri) {
    return { ok: false, message: MFA_ENROLL_FAILED }
  }
  return {
    ok: true,
    data: {
      factorId: data.id,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  }
}

export async function confirmTotpEnroll(factorId: string, code: string): Promise<MfaActionResult> {
  const challenge = await supabase.auth.mfa.challenge({ factorId })
  if (challenge.error || !challenge.data?.id) {
    return { ok: false, message: MFA_VERIFY_ENROLL_FAILED }
  }
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  })
  if (verify.error) {
    return { ok: false, message: MFA_VERIFY_ENROLL_FAILED }
  }
  return { ok: true }
}

export async function verifySignInTotp(code: string): Promise<MfaActionResult> {
  const factors = await listTotpFactors()
  const verified = factors.find((f) => f.status === 'verified')
  if (!verified) {
    return { ok: false, message: MFA_CODE_INVALID }
  }
  const challenge = await supabase.auth.mfa.challenge({ factorId: verified.id })
  if (challenge.error || !challenge.data?.id) {
    return { ok: false, message: MFA_CODE_INVALID }
  }
  const verify = await supabase.auth.mfa.verify({
    factorId: verified.id,
    challengeId: challenge.data.id,
    code: code.trim(),
  })
  if (verify.error) {
    return { ok: false, message: MFA_CODE_INVALID }
  }
  return { ok: true }
}

export async function removeTotpFactor(factorId: string): Promise<MfaActionResult> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) {
    return { ok: false, message: MFA_REMOVE_FAILED }
  }
  return { ok: true }
}

export async function reauthenticateWithPassword(email: string, password: string): Promise<MfaActionResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false, message: 'That password did not match. Try again.' }
  }
  return { ok: true }
}
