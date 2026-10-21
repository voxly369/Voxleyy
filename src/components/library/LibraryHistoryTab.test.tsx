import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LibraryPage from '../../pages/LibraryPage.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

vi.mock('../../lib/reader/offlineReadingStore.ts', () => ({
  listOfflinePackages: vi.fn(async () => []),
}))

vi.mock('../../lib/library/listLibrary.ts', () => ({
  listContinueReading: vi.fn(async () => ({ ok: true, items: [] })),
  listLibrarySaved: vi.fn(async () => ({ ok: true, items: [], nextCursor: null })),
  listReadingHistory: vi.fn(async () => ({
    ok: true,
    items: [
      {
        creationId: '00000000-0000-0000-0000-000000000001',
        isAvailable: true,
        type: 'story',
        title: 'History story',
        caption: null,
        bodyExcerpt: null,
        bodyTruncated: false,
        coverUrl: null,
        publishedAt: '2026-01-01T00:00:00Z',
        author: { id: 'a', username: 'writer', displayName: 'Writer', avatarUrl: null, verified: false },
        percent: 42,
        completed: false,
      },
    ],
  })),
  listCollections: vi.fn(async () => ({ ok: true, collections: [] })),
  listCollectionItems: vi.fn(async () => ({ ok: true, items: [] })),
  removeSaved: vi.fn(),
  removeHistoryItem: vi.fn(),
  clearReadingHistory: vi.fn(async () => ({ ok: true })),
}))

describe('Library history tab', () => {
  it('lists history items and clears history after confirm', async () => {
    const { clearReadingHistory } = await import('../../lib/library/listLibrary.ts')
    const user = userEvent.setup()
    render(
      <ModalStackProvider>
        <MemoryRouter initialEntries={['/library?tab=history']}>
          <LibraryPage />
        </MemoryRouter>
      </ModalStackProvider>,
    )
    expect(await screen.findByText('History story')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Clear history' })[0]!)
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Clear history' }))
    expect(clearReadingHistory).toHaveBeenCalled()
  })
})
