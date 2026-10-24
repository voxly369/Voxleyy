/** Matches server `redeem_invite_code` normalization (Crockford-style, no I/L/O/0/1). */
export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{10}$/

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export function isValidInviteCodeFormat(raw: string): boolean {
  const normalized = normalizeInviteCode(raw)
  if (!normalized) return false
  return INVITE_CODE_PATTERN.test(normalized)
}

export function inviteCodeFormatError(raw: string): string | null {
  const normalized = normalizeInviteCode(raw)
  if (!normalized) return 'Enter your invite code.'
  if (!INVITE_CODE_PATTERN.test(normalized)) return 'That invite code is not valid.'
  return null
}
