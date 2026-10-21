import { describe, expect, it } from 'vitest'
import { countWords, estimatedMinutesRemaining } from './estimatedTime.ts'

describe('estimatedTime', () => {
  it('counts words and estimates minutes at 200 wpm', () => {
    expect(countWords('one two three four')).toBe(4)
    expect(estimatedMinutesRemaining(400, 50)).toBe(1)
  })
})
