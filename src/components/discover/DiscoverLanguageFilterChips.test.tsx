import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DiscoverLanguageFilterChips } from './DiscoverLanguageFilterChips.tsx'

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

describe('DiscoverLanguageFilterChips', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    navigate.mockReset()
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
})
