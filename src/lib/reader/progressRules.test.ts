import { describe, expect, it } from 'vitest'
import { COMPLETION_PERCENT, clampPercent, isReadingCompleted } from './progressRules.ts'
import { shouldSaveProgress, PROGRESS_SAVE_INTERVAL_MS } from './throttleProgress.ts'

describe('progress rules', () => {
  it('marks completed at 98 percent', () => {
    expect(isReadingCompleted(COMPLETION_PERCENT)).toBe(true)
    expect(isReadingCompleted(97)).toBe(false)
  })

  it('clamps percent', () => {
    expect(clampPercent(120)).toBe(100)
    expect(clampPercent(-3)).toBe(0)
  })

  it('throttles progress saves to 5 seconds', () => {
    expect(shouldSaveProgress(null, 0)).toBe(true)
    expect(shouldSaveProgress(0, PROGRESS_SAVE_INTERVAL_MS - 1)).toBe(false)
    expect(shouldSaveProgress(0, PROGRESS_SAVE_INTERVAL_MS)).toBe(true)
  })
})
