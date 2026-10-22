import { describe, expect, it } from 'vitest'
import { validatePinAction } from './pinValidation.ts'

describe('validatePinAction', () => {
  it('blocks a fourth pin', () => {
    const pinned = ['a', 'b', 'c']
    expect(validatePinAction(pinned, 'd', 'pin')).toEqual({
      ok: false,
      message: 'You can pin up to 3 badges. Unpin one first.',
    })
  })

  it('allows unpin when present', () => {
    expect(validatePinAction(['a'], 'a', 'unpin')).toEqual({ ok: true })
  })
})
