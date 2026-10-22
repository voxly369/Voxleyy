import { describe, expect, it } from 'vitest'
import { messagesBadgeLabel } from './MessagesNavBadge.tsx'

describe('messagesBadgeLabel', () => {
  it('caps at 99+', () => {
    expect(messagesBadgeLabel(0)).toBe('')
    expect(messagesBadgeLabel(4)).toBe('4')
    expect(messagesBadgeLabel(120)).toBe('99+')
  })
})
