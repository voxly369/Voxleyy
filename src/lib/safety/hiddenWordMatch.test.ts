import { describe, expect, it } from 'vitest'
import { hiddenWordMatch, textContainsHiddenWord } from './hiddenWordMatch.ts'

describe('hiddenWordMatch', () => {
  it('matches case-insensitive substrings', () => {
    expect(hiddenWordMatch('Hello WORLD', ['world'])).toBe(true)
  })

  it('returns false when no words match', () => {
    expect(hiddenWordMatch('clean text', ['spam', 'bad'])).toBe(false)
  })

  it('textContainsHiddenWord wraps single word', () => {
    expect(textContainsHiddenWord('no match', 'zzz')).toBe(false)
    expect(textContainsHiddenWord('has SPAM here', 'spam')).toBe(true)
  })
})
