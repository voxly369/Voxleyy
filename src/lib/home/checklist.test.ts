import { describe, expect, it } from 'vitest'
import { checklistCompletion, checklistDoneCount } from './checklist.ts'

describe('checklistCompletion', () => {
  it('marks items from real signals', () => {
    const progress = checklistCompletion({
      hasBio: true,
      postCount: 1,
      followCount: 2,
      librarySaveCount: 0,
      readingProgressCount: 1,
      feedbackSent: false,
    })
    expect(progress.first_post).toBe(true)
    expect(progress.library_save).toBe(false)
    expect(checklistDoneCount(progress)).toBe(4)
  })
})
