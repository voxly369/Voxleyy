import { describe, expect, it } from 'vitest'
import {
  founderInviteCodeFormSchema,
  founderInviteCodeRpcPayload,
} from './inviteCodeFormSchema.ts'

describe('founderInviteCodeFormSchema', () => {
  it('accepts multi-use with optional expiry and note', () => {
    const values = founderInviteCodeFormSchema.parse({
      maxUses: '5',
      expiresAt: '2026-12-31',
      note: 'Beta cohort',
    })
    expect(values.maxUses).toBe(5)
    expect(values.note).toBe('Beta cohort')
    const rpc = founderInviteCodeRpcPayload(values)
    expect(rpc.p_max_uses).toBe(5)
    expect(rpc.p_note).toBe('Beta cohort')
    expect(rpc.p_expires_at).toMatch(/2026-12-31/)
  })

  it('rejects invalid max uses', () => {
    expect(() => founderInviteCodeFormSchema.parse({ maxUses: 0 })).toThrow()
    expect(() => founderInviteCodeFormSchema.parse({ maxUses: -1 })).toThrow()
  })

  it('maps empty optional fields to null for RPC', () => {
    const rpc = founderInviteCodeRpcPayload({ maxUses: 1 })
    expect(rpc.p_expires_at).toBeNull()
    expect(rpc.p_note).toBeNull()
  })
})
