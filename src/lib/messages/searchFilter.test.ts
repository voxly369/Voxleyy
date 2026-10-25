import { describe, expect, it } from 'vitest'
import { filterConversations } from './searchFilter.ts'
import type { ConversationSummary } from './types.ts'

const sample: ConversationSummary = {
  conversationId: 'c1',
  lastActivityAt: '2026-01-01T00:00:00.000Z',
  muted: false,
  otherUserId: 'u2',
  otherUsername: 'writertwo',
  otherDisplayName: 'Writer Two',
  otherAvatarUrl: null,
  otherCountry: null,
  otherShowLocalTime: false,
  otherTimezone: 'UTC',
  otherAccountDeleted: false,
  unreadCount: 0,
  preview: 'Hello there',
}

describe('filterConversations', () => {
  it('matches username and preview', () => {
    expect(filterConversations([sample], 'writer')).toHaveLength(1)
    expect(filterConversations([sample], 'hello')).toHaveLength(1)
    expect(filterConversations([sample], 'nomatch')).toHaveLength(0)
  })
})
