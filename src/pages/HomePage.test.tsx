import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage.tsx'
import { feedOfflineMessage } from '../lib/feed/offline.ts'

vi.mock('../lib/feed/listFeed.ts', () => ({
  listFeed: vi.fn(),
}))

import { listFeed } from '../lib/feed/listFeed.ts'

describe('HomePage offline', () => {
  beforeEach(() => {
    vi.mocked(listFeed).mockReset()
  })

  it('shows the offline message and Retry loads the feed after the browser comes back online', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    vi.mocked(listFeed).mockResolvedValue({
      ok: true,
      data: { posts: [], nextCursor: null },
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(feedOfflineMessage())

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    window.dispatchEvent(new Event('online'))

    await waitFor(() => {
      expect(listFeed).toHaveBeenCalled()
    })
  })
})
