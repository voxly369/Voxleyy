import { isFounderSignupEmail } from './founderSignup.ts'

/** True when the sign-up form must collect and validate an invite code before calling Auth. */
export function signupRequiresInviteCode(inviteOnly: boolean, email: string): boolean {
  return inviteOnly && !isFounderSignupEmail(email)
}
