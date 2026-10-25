import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DiscoverBrowsePage from '../../pages/DiscoverBrowsePage.tsx'
import DiscoverSearchPage from '../../pages/DiscoverSearchPage.tsx'
import { DiscoverLanguageFilterChips } from './DiscoverLanguageFilterChips.tsx'

const listDiscoverPosts = vi.fn()
const runSearch = vi.fn()

vi.mock('../../lib/discover/listDiscover.ts', () => ({
  listDiscoverPosts: (...args: unknown[]) => listDiscoverPosts(...args),
}))

vi.mock('../../lib/discover/searchApi.ts', () => ({
  runSearch: (...args: unknown[]) => runSearch(...args),
}))

const navigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../../lib/onboarding/api.ts', () => ({
  fetchMyProfilePreferences: vi.fn(async () => ({
    ok: true,
    data: { languages: ['en', 'af'] },
  })),
}))

vi.mock('../../components/shell/FeedWithRailLayout.tsx', () => ({
  FeedWithRailLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('DiscoverLanguageFilterChips', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    navigate.mockReset()
    listDiscoverPosts.mockResolvedValue({ ok: true, data: { posts: [], nextCursor: null } })
    runSearch.mockResolvedValue({ ok: true, data: { writers: [], posts: [], tags: [] } })
  })

  it('toggles a language chip and updates browse URL', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/discover/browse?sort=trending']}>
        <Routes>
          <Route path="/discover/browse" element={<DiscoverLanguageFilterChips page="browse" />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('tab', { name: /Afrikaans/i }))
    expect(navigate).toHaveBeenCalledWith('/discover/browse?languages=af&sort=trending')
  })

  it('applies My languages shortcut', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/discover/browse']}>
        <Routes>
          <Route path="/discover/browse" element={<DiscoverLanguageFilterChips page="browse" />} />
        </Routes>
      </MemoryRouter>,
    )
    const myLanguages = await screen.findByTestId('language-filter-my-languages')
    await waitFor(() => expect(myLanguages).not.toBeDisabled())
    await user.click(myLanguages)
    expect(navigate).toHaveBeenCalledWith('/discover/browse?languages=af%2Cen')
  })

  it('removes a selected chip from the URL', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/discover/browse?languages=af%2Cen']}>
        <Routes>
          <Route path="/discover/browse" element={<DiscoverLanguageFilterChips page="browse" />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('tab', { name: /Afrikaans/i }))
    expect(navigate).toHaveBeenCalledWith('/discover/browse?languages=en')
  })

  it('preserves search query when filtering on search page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/discover/search?q=poetry']}>
        <Routes>
          <Route path="/discover/search" element={<DiscoverLanguageFilterChips page="search" />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('tab', { name: /العربية/i }))
    expect(navigate).toHaveBeenCalledWith('/discover/search?languages=ar&q=poetry')
  })

  it('shows browse empty state when language filter returns no posts', async () => {
    render(
      <MemoryRouter initialEntries={['/discover/browse?languages=ar']}>
        <Routes>
          <Route path="/discover/browse" element={<DiscoverBrowsePage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('browse-language-empty')).toBeInTheDocument()
    expect(screen.getByText(/Nothing matched those languages/i)).toBeInTheDocument()
  })

  it('shows search empty state when language filter returns no posts', async () => {
    render(
      <MemoryRouter initialEntries={['/discover/search?q=poetry&languages=ar']}>
        <Routes>
          <Route path="/discover/search" element={<DiscoverSearchPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('search-language-empty')).toBeInTheDocument()
  })
})
