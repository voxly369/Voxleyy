import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignUpPage from './SignUpPage.tsx'

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    signUp: vi.fn(async () => ({ ok: true as const })),
  }),
}))

vi.mock('../../lib/beta/signupConfig.ts', () => ({
  fetchBetaSignupConfig: vi.fn(async () => ({
    signups_open: true,
    invite_only: false,
    waitlist_open: false,
    closed_message: null,
  })),
  joinBetaWaitlist: vi.fn(),
  checkInviteCodeValid: vi.fn(async () => true),
}))

vi.mock('../../lib/auth/useUsernameAvailability.ts', () => ({
  useUsernameAvailability: () => 'available',
}))

describe('SignUpPage', () => {
  afterEach(() => cleanup())

  it('renders the signup form when signups are open', async () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByTestId('signup-age-consent')).toBeInTheDocument()
  })
})
