import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotificationRow } from './NotificationRow.tsx'

describe('NotificationRow', () => {
  it('links mention rows to creation', () => {
    render(
      <MemoryRouter>
        <NotificationRow
          row={{
            id: 'n1',
            type: 'mention',
            actor: { id: 'a', username: 'writer', displayName: 'Writer', avatarUrl: null, verified: true },
            targetType: 'creation',
            targetId: '00000000-0000-0000-0000-000000000001',
            data: {},
            held: false,
            createdAt: '2026-01-01T00:00:00Z',
            readAt: null,
            targetTitle: 'Post',
            targetExcerpt: null,
          }}
        />
      </MemoryRouter>,
    )
    const link = screen.getByTestId('notification-row')
    expect(link).toHaveAttribute('href', '/c/00000000-0000-0000-0000-000000000001')
    expect(link).toHaveTextContent('mentioned you')
    expect(screen.getByLabelText('Verified account')).toBeInTheDocument()
  })
})
