import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfilePostTile } from './ProfilePostTile.tsx'
import type { PublishedWorkSummary } from '../../lib/creations/types.ts'

function work(overrides: Partial<PublishedWorkSummary> = {}): PublishedWorkSummary {
  return {
    id: 'w1',
    type: 'poem',
    title: 'The Watcher of the Northern Light',
    coverUrl: null,
    publishedAt: '2026-01-01T00:00:00Z',
    audience: 'public',
    likeCount: 1,
    commentCount: 0,
    viewCount: 0,
    bodyText: '\n\n\nFirst visible line after blanks\nSecond line',
    bodyJson: null,
    ...overrides,
  }
}

describe('ProfilePostTile excerpt', () => {
  it('never renders an empty text tile when body has content after leading blanks', () => {
    render(
      <MemoryRouter>
        <ProfilePostTile work={work()} saved={false} saveBusy={false} onToggleSave={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/First visible line/i)).toBeInTheDocument()
  })
})
