import { describe, expect, it } from 'vitest'
import { formatCountLabel } from './formatCountLabel.ts'

describe('formatCountLabel', () => {
  it('uses singular and plural forms', () => {
    expect(formatCountLabel(1, 'like')).toBe('1 like')
    expect(formatCountLabel(2, 'like')).toBe('2 likes')
    expect(formatCountLabel(1, 'follower')).toBe('1 follower')
    expect(formatCountLabel(1, 'comment')).toBe('1 comment')
    expect(formatCountLabel(1, 'work')).toBe('1 work')
    expect(formatCountLabel(1, 'save')).toBe('1 save')
    expect(formatCountLabel(1, 'following')).toBe('1 following')
    expect(formatCountLabel(3, 'following')).toBe('3 following')
  })
})
