import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LibraryPage from '../../pages/LibraryPage.tsx'

vi.mock('../../lib/reader/offlineReadingStore.ts', () => ({
  listOfflinePackages: vi.fn(async () => []),
}))

vi.mock('../../lib/library/listLibrary.ts', () => ({
  listContinueReading: vi.fn(async () => ({ ok: true, items: [] })),
  listLibrarySaved: vi.fn(async () => ({ ok: true, items: [], nextCursor: null })),
  listReadingHistory: vi.fn(async () => ({ ok: true, items: [] })),
  listCollections: vi.fn(async () => ({ ok: true, collections: [] })),
  listCollectionItems: vi.fn(async () => ({ ok: true, items: [] })),
  removeSaved: vi.fn(),
  removeHistoryItem: vi.fn(),
  clearReadingHistory: vi.fn(),
}))

describe('LibraryPage tabs', () => {
  it('shows purchased empty state copy', async () => {
    render(
      <MemoryRouter initialEntries={['/library?tab=purchased']}>
        <LibraryPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/Everything you buy will appear here/i)).toBeInTheDocument()
  })

  it('shows unavailable card copy in saved tab', async () => {
    const { listLibrarySaved } = await import('../../lib/library/listLibrary.ts')
    vi.mocked(listLibrarySaved).mockResolvedValueOnce({
      ok: true,
      items: [
        {
          creationId: '00000000-0000-0000-0000-000000000099',
          isAvailable: false,
          type: null,
          title: null,
          caption: null,
          bodyExcerpt: null,
          bodyTruncated: false,
          coverUrl: null,
          publishedAt: null,
          author: null,
          savedAt: '2026-01-01T00:00:00Z',
        },
      ],
      nextCursor: null,
    })
    render(
      <MemoryRouter initialEntries={['/library?tab=saved']}>
        <LibraryPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/No longer available/i)).toBeInTheDocument()
  })
})
