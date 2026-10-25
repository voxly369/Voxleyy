import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CountryPage from './CountryPage.tsx'

const fetchCountryPage = vi.fn()
const listCountryTrending = vi.fn()
const listCountryRisingWriters = vi.fn()

vi.mock('../lib/country/api.ts', () => ({
  fetchCountryPage: (...args: unknown[]) => fetchCountryPage(...args),
  listCountryTrending: (...args: unknown[]) => listCountryTrending(...args),
  listCountryRisingWriters: (...args: unknown[]) => listCountryRisingWriters(...args),
}))

vi.mock('../components/shell/FeedWithRailLayout.tsx', () => ({
  FeedWithRailLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../components/discover/DiscoverPostStrip.tsx', () => ({
  DiscoverPostStrip: () => <div data-testid="country-trending-posts" />,
}))

vi.mock('../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    profile: { show_local_time: mockShowLocalTime },
  }),
}))

let mockShowLocalTime = true

function renderCountry(code = 'ZA') {
  return render(
    <MemoryRouter initialEntries={[`/country/${code}`]}>
      <Routes>
        <Route path="/country/:code" element={<CountryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CountryPage', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockShowLocalTime = true
    fetchCountryPage.mockResolvedValue({
      ok: true,
      data: {
        code: 'ZA',
        name: 'South Africa',
        primaryTimezone: 'Africa/Johannesburg',
        mainLanguages: ['en', 'af'],
        writerCount: 3,
        postCount: 8,
      },
    })
    listCountryTrending.mockResolvedValue({
      ok: true,
      posts: [
        {
          id: 'p1',
          type: 'poem',
          title: 'ZA poem',
          caption: null,
          status: 'published',
          audience: 'public',
          coverUrl: null,
          createdAt: '2026-01-01T00:00:00Z',
          publishedAt: '2026-01-01T00:00:00Z',
          author: {
            id: 'a1',
            username: 'za-poet',
            displayName: 'ZA Poet',
            avatarUrl: null,
            verified: false,
          },
          bodyExcerpt: 'Lines from the south.',
          bodyTruncated: false,
          likeCount: 0,
          commentCount: 0,
          saveCount: 0,
          likedByViewer: false,
          savedByViewer: false,
          tags: [],
        },
      ],
      nextCursor: null,
    })
    listCountryRisingWriters.mockResolvedValue({ ok: true, data: [] })
  })

  it('shows loading then populated country metadata', async () => {
    renderCountry()
    expect(screen.getByTestId('country-page-loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('country-page')).toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1, name: /South Africa/ })).toBeInTheDocument()
    expect(screen.getByTestId('country-trending')).toBeInTheDocument()
  })

  it('shows error with Retry', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } })
    fetchCountryPage.mockResolvedValue({ ok: false, message: 'Country did not load' })
    renderCountry()
    expect(await screen.findByRole('alert')).toHaveTextContent(/Country did not load/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(reload).toHaveBeenCalled()
  })

  it('shows empty trending when there are no posts', async () => {
    listCountryTrending.mockResolvedValue({ ok: true, posts: [], nextCursor: null })
    fetchCountryPage.mockResolvedValue({
      ok: true,
      data: {
        code: 'AQ',
        name: 'Antarctica',
        primaryTimezone: null,
        mainLanguages: [],
        writerCount: 0,
        postCount: 0,
      },
    })
    renderCountry('AQ')
    await waitFor(() => expect(screen.getByText(/No public posts yet/)).toBeInTheDocument())
  })

  it('hides local time when show_local_time is off', async () => {
    mockShowLocalTime = false
    renderCountry()
    await waitFor(() => expect(screen.getByTestId('country-page')).toBeInTheDocument())
    expect(screen.queryByTestId('country-local-time')).toBeNull()
  })
})
