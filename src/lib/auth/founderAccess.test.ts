import { describe, expect, it } from 'vitest'
import { founderAccessFromRpc } from './founderAccess.ts'

describe('founderAccessFromRpc', () => {
  it('grants access only when RPC returns true', () => {
    expect(founderAccessFromRpc(true)).toBe(true)
    expect(founderAccessFromRpc(false)).toBe(false)
    expect(founderAccessFromRpc(null)).toBe(false)
    expect(founderAccessFromRpc(undefined)).toBe(false)
  })
})
