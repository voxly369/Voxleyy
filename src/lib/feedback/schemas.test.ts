import { describe, expect, it } from 'vitest'
import { feedbackFormSchema } from './schemas.ts'

describe('feedbackFormSchema', () => {
  it('accepts valid feedback', () => {
    const parsed = feedbackFormSchema.safeParse({
      category: 'idea',
      message: 'This is at least ten characters.',
      includePage: true,
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects short messages', () => {
    const parsed = feedbackFormSchema.safeParse({
      category: 'bug',
      message: 'short',
      includePage: false,
    })
    expect(parsed.success).toBe(false)
  })
})
