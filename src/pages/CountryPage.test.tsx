import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

vi.mock('../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    profile: { show_local_time: true },
  }),
}))

describe('CountryPage', () => {
  beforeEach(() => {
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
    listCountryTrending.mockResolvedValue({ ok: true, posts: [], nextCursor: null })
    listCountryRisingWriters.mockResolvedValue({ ok: true, data: [] })
  })

  it('renders country metadata', async () => {
    render(
      <MemoryRouter initialEntries={['/country/ZA']}>
        <Routes>
          <Route path="/country/:code" element={<CountryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('country-page')).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { level: 1, name: /South Africa/ })).toBeInTheDocument()
    expect(screen.getByTestId('country-trending')).toBeInTheDocument()
  })
})
