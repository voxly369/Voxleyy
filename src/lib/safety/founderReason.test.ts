import { describe, expect, it } from 'vitest'
import { validateFounderReason } from './founderReason.ts'

describe('validateFounderReason', () => {
  it('requires non-empty trimmed reason', () => {
    expect(validateFounderReason('   ').ok).toBe(false)
    expect(validateFounderReason('Valid reason').ok).toBe(true)
  })

  it('rejects reasons over 500 characters', () => {
    expect(validateFounderReason('a'.repeat(501)).ok).toBe(false)
  })
})
