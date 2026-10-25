import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthCallbackPage from './AuthCallbackPage.tsx'

const { getSession, onAuthStateChange } = vi.hoisted(() => {
  const getSession = vi.fn(async () => ({ data: { session: null } }))
  const onAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
  return { getSession, onAuthStateChange }
})

vi.mock('../../lib/supabaseClient.ts', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
    },
  },
}))

describe('AuthCallbackPage', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows loading initially', () => {
    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Confirming' })).toBeInTheDocument()
  })

  it('shows expired state when error query present', () => {
    vi.stubGlobal('location', {
      ...window.location,
      search: '?error=access_denied&error_code=otp_expired',
      hash: '',
    })
    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Link expired' })).toBeInTheDocument()
  })

  it('shows confirmed when session arrives', async () => {
    vi.stubGlobal('location', { ...window.location, search: '', hash: '' })
    getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1' } } },
    })
    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Email confirmed' })).toBeInTheDocument()
    })
  })
})
