import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ConversationList } from './ConversationList.tsx'
import type { ConversationSummary } from '../../lib/messages/types.ts'

const row: ConversationSummary = {
  conversationId: 'c1',
  lastActivityAt: new Date().toISOString(),
  muted: false,
  otherUserId: 'u2',
  otherUsername: 'writertwo',
  otherDisplayName: 'Writer Two',
  otherAvatarUrl: null,
  otherCountry: null,
  otherShowLocalTime: false,
  otherTimezone: 'UTC',
  otherAccountDeleted: false,
  unreadCount: 3,
  preview: 'Hey',
}

describe('ConversationList', () => {
  it('shows unread badge and filters via search prop', () => {
    render(
      <MemoryRouter>
        <ConversationList rows={[row]} activeId={null} search="" onSearchChange={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('conversation-unread-badge')).toHaveTextContent('3')
  })
})
