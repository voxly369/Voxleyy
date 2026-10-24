import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fetchMfaAssurance } from './assurance.ts'

const { getAuthenticatorAssuranceLevel } = vi.hoisted(() => ({
  getAuthenticatorAssuranceLevel: vi.fn(),
}))

vi.mock('../../supabaseClient.ts', () => ({
  supabase: {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel,
      },
    },
  },
}))

describe('fetchMfaAssurance', () => {
  beforeEach(() => {
    getAuthenticatorAssuranceLevel.mockReset()
  })

  it('needsChallenge when next is aal2 and current is not', async () => {
    getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    const result = await fetchMfaAssurance()
    expect(result.needsChallenge).toBe(true)
  })

  it('does not need challenge when levels match', async () => {
    getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
    const result = await fetchMfaAssurance()
    expect(result.needsChallenge).toBe(false)
  })
})
