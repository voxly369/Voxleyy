import { describe, expect, it } from 'vitest'
import { wholeLineExcerpt } from './wholeLineExcerpt.ts'

describe('wholeLineExcerpt', () => {
  it('clamps on whole lines only', () => {
    const long = ['alpha', 'beta', 'gamma', 'delta'].join('\n')
    const { text, truncated } = wholeLineExcerpt(long, 2)
    expect(truncated).toBe(true)
    expect(text).toBe('alpha\nbeta…')
    expect(text).not.toContain('gam')
  })
})
