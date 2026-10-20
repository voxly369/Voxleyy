import { describe, expect, it } from 'vitest'
import { dailyPromptIndex, pickDailyPrompt } from './dailyPrompt.ts'

describe('dailyPrompt', () => {
  it('picks deterministically by UTC date', () => {
    const prompts = ['a', 'b', 'c']
    const day = new Date(Date.UTC(2026, 9, 20))
    const idx = dailyPromptIndex(3, day)
    expect(pickDailyPrompt(prompts, day)).toBe(prompts[idx])
    expect(pickDailyPrompt(prompts, day)).toBe(pickDailyPrompt(prompts, day))
  })
})
