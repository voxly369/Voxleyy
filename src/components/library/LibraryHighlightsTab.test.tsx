import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LibraryHighlightsTab } from './LibraryHighlightsTab.tsx'

vi.mock('../../lib/library/listLibraryHighlights.ts', () => ({
  listLibraryHighlights: vi.fn(async () => ({
    ok: true,
    rows: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        creationId: '550e8400-e29b-41d4-a716-446655440000',
        quote: 'Saved quote',
        colour: 'yellow',
        note: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        isAvailable: true,
        title: 'Story',
        authorDisplayName: 'Writer',
        authorUsername: 'writer',
        coverUrl: null,
        textChanged: false,
      },
    ],
    nextCursor: null,
  })),
}))

describe('LibraryHighlightsTab', () => {
  it('lists highlight quotes', async () => {
    render(
      <MemoryRouter>
        <LibraryHighlightsTab />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Saved quote')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open in reader' })).toHaveAttribute(
      'href',
      '/read/550e8400-e29b-41d4-a716-446655440000',
    )
  })
})
