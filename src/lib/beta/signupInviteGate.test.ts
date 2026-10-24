import { describe, expect, it } from 'vitest'
import { FOUNDER_SIGNUP_EMAIL } from './founderSignup.ts'
import { signupRequiresInviteCode } from './signupInviteGate.ts'

describe('signupRequiresInviteCode', () => {
  it('requires an invite for a .test address when invite-only is on', () => {
    expect(signupRequiresInviteCode(true, 'reader@fixture.test')).toBe(true)
  })

  it('does not require an invite for the Founder email when invite-only is on', () => {
    expect(signupRequiresInviteCode(true, FOUNDER_SIGNUP_EMAIL)).toBe(false)
  })

  it('does not require an invite when invite-only is off', () => {
    expect(signupRequiresInviteCode(false, 'reader@fixture.test')).toBe(false)
  })
})
