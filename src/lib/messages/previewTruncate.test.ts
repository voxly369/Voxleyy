import { describe, expect, it } from 'vitest'
import { truncateConversationPreview } from './previewTruncate.ts'

describe('truncateConversationPreview', () => {
  it('collapses whitespace and truncates long previews', () => {
    const text = 'Hello\n\nworld '.repeat(20)
    const out = truncateConversationPreview(text, 30)
    expect(out.length).toBeLessThanOrEqual(30)
    expect(out).not.toContain('\n')
  })

  it('returns empty for null', () => {
    expect(truncateConversationPreview(null)).toBe('')
  })
})
