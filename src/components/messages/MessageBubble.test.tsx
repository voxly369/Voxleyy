import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { MessageBubble } from './MessageBubble.tsx'

vi.mock('../../lib/messages/api.ts', () => ({
  deleteMessage: vi.fn(),
}))

describe('MessageBubble', () => {
  it('renders deleted placeholder', () => {
    render(
      <ModalStackProvider>
      <MessageBubble
        message={{
          id: 'm1',
          conversationId: 'c1',
          senderId: 'u1',
          body: null,
          sharedCreationId: null,
          deliverAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          deletedAt: '2026-01-01T01:00:00.000Z',
          isDeleted: true,
          isScheduled: false,
        }}
        isOwn={false}
      />
      </ModalStackProvider>
    )
    expect(screen.getByText('Message deleted')).toBeInTheDocument()
  })
})
