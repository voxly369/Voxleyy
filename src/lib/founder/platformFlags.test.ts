import { describe, expect, it } from 'vitest'
import {
  founderPlatformFlagInputSchema,
  founderPlatformFlagRpcCalls,
} from './platformFlagSchema.ts'

describe('founderPlatformFlagRpcCalls', () => {
  it('maps invite_only to beta json with non-empty reason', () => {
    const calls = founderPlatformFlagRpcCalls('beta_invite_only', true, { signups_open: true }, {})
    expect(calls).toHaveLength(1)
    expect(calls[0]?.p_key).toBe('beta')
    expect(calls[0]?.p_value).toEqual({ signups_open: true, invite_only: true })
    expect(calls[0]?.p_reason.length).toBeGreaterThan(0)
  })

  it('signups_open updates beta and signups keys', () => {
    const calls = founderPlatformFlagRpcCalls(
      'beta_signups_open',
      false,
      { invite_only: false, waitlist_open: true },
      { open: true },
    )
    expect(calls).toHaveLength(2)
    expect(calls[0]?.p_value).toMatchObject({ signups_open: false })
    expect(calls[1]).toEqual({
      p_key: 'signups',
      p_value: { open: false },
      p_reason: expect.any(String),
    })
  })

  it('rejects unknown flag keys', () => {
    expect(founderPlatformFlagInputSchema.safeParse({ flag: 'nope', enabled: true }).success).toBe(false)
  })
})
