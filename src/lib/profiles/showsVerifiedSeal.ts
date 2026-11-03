import type { UserRole } from '../auth/profile.ts'

/** Verified seal beside the name: purchased flag or Founder role (client-side, no extra DB field). */
export function showsVerifiedSeal(verified: boolean, role?: UserRole | null): boolean {
  return verified || role === 'founder'
}

/** Feed / comments when `role` is not embedded — Founder badge implies the seal. */
export function showsAuthorVerifiedSeal(
  verified: boolean,
  feedBadges?: readonly { badgeKey: string }[] | null,
): boolean {
  if (feedBadges?.some((badge) => badge.badgeKey === 'founder')) return true
  return verified
}
