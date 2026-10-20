import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DiscoverSearchPage from './DiscoverSearchPage.tsx'

vi.mock('../lib/discover/searchApi.ts', () => ({
  runSearch: vi.fn(),
}))

vi.mock('../components/discover/DiscoverFollowButton.tsx', () => ({
  DiscoverFollowButton: () => <button type="button">Follow</button>,
}))

vi.mock('../components/shell/FeedWithRailLayout.tsx', () => ({
  FeedWithRailLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { runSearch } from '../lib/discover/searchApi.ts'

const mockedSearch = vi.mocked(runSearch)

function renderSearch(initial = '/discover/search?q=poet') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/discover/search" element={<DiscoverSearchPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DiscoverSearchPage tabs', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockedSearch.mockResolvedValue({
      ok: true,
      data: {
        writers: [{ id: 'w1', username: 'poet1', displayName: 'Poet One', avatarUrl: null, verified: false, followerCount: 3 }],
        posts: [
          {
            id: 'p1',
            type: 'poem',
            title: 'Moon',
            caption: null,
            bodyExcerpt: 'Two lines of poem',
            bodyTruncated: false,
            publishedAt: '2026-01-01T00:00:00Z',
            likeCount: 1,
            author: { username: 'poet1', displayName: 'Poet One', avatarUrl: null, verified: false },
          },
        ],
        tags: [{ tag: 'poetry', postCount: 4 }],
      },
    })
  })

  it('shows Writers tab results', async () => {
    renderSearch()
    await waitFor(() => expect(mockedSearch).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('tab', { name: 'Writers' }))
    expect(await screen.findByText('Poet One')).toBeInTheDocument()
  })

  it('shows Posts tab results', async () => {
    renderSearch()
    await userEvent.click(screen.getByRole('tab', { name: 'Posts' }))
    expect(await screen.findByText('Moon')).toBeInTheDocument()
  })

  it('shows Tags tab results', async () => {
    renderSearch()
    await userEvent.click(screen.getByRole('tab', { name: 'Tags' }))
    expect(await screen.findByText('#poetry')).toBeInTheDocument()
  })
})
