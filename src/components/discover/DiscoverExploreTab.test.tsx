import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DiscoverExploreTab } from './DiscoverExploreTab.tsx'

vi.mock('../../lib/discover/listDiscover.ts', () => ({
  listFeaturedWriters: vi.fn(async () => ({ ok: true, data: [] })),
  fetchDailyWritingPrompt: vi.fn(async () => ({ ok: true, prompt: 'Write about the horizon.' })),
  listDiscoverPosts: vi.fn(async () => ({ ok: true, data: { posts: [], nextCursor: null } })),
  listRisingWriters: vi.fn(async () => ({ ok: true, data: [] })),
}))

vi.mock('./DiscoverFollowButton.tsx', () => ({
  DiscoverFollowButton: () => <button type="button">Follow</button>,
}))

vi.mock('../feed/PostCard.tsx', () => ({
  PostCard: () => <article>Post</article>,
}))

function renderExplore() {
  return render(
    <MemoryRouter>
      <DiscoverExploreTab />
    </MemoryRouter>,
  )
}

describe('DiscoverExploreTab', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Explore sections in spec order', async () => {
    renderExplore()
    const ids = [
      'discover-spoken-word',
      'discover-featured-writers',
      'discover-word-of-day',
      'discover-trending',
      'discover-new',
      'discover-rising-voices',
      'discover-top-poems',
      'discover-top-stories',
      'discover-trending-sounds',
      'discover-trending-challenges',
    ]
    for (const id of ids) {
      expect(await screen.findByTestId(id)).toBeInTheDocument()
    }
    const ordered = ids.map((id) => screen.getByTestId(id))
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i - 1].compareDocumentPosition(ordered[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('shows spoken word empty state', async () => {
    renderExplore()
    const section = await screen.findByTestId('discover-spoken-word')
    expect(within(section).getByText(/no recitations yet/i)).toBeInTheDocument()
  })

  it('shows featured writers empty state when none curated', async () => {
    renderExplore()
    const section = await screen.findByTestId('discover-featured-writers')
    expect(await within(section).findByText(/no featured writers yet/i)).toBeInTheDocument()
  })

  it('shows Word of the Day prompt and Write now', async () => {
    renderExplore()
    const section = await screen.findByTestId('discover-word-of-day')
    expect(await within(section).findByText('Write about the horizon.')).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Write now' })).toBeInTheDocument()
  })

  it('shows trending sounds and challenges placeholders', async () => {
    renderExplore()
    expect(await screen.findByTestId('discover-trending-sounds')).toBeInTheDocument()
    expect(await screen.findByTestId('discover-trending-challenges')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trending Sounds' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trending Challenges' })).toBeInTheDocument()
  })
})
