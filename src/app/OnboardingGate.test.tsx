import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OnboardingGate } from './OnboardingGate.tsx'

const fetchMyProfilePreferences = vi.fn()

vi.mock('../lib/onboarding/api.ts', () => ({
  fetchMyProfilePreferences: (...args: unknown[]) => fetchMyProfilePreferences(...args),
}))

vi.mock('../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    isFounder: true,
    profile: { id: 'founder-1', username: 'founder', display_name: 'Founder', timezone: 'UTC' },
  }),
}))

vi.mock('../components/entrance/EntranceScreen.tsx', () => ({
  EntranceScreen: () => <div data-testid="entrance-welcome">Welcome</div>,
}))

vi.mock('../components/onboarding/OnboardingFlow.tsx', () => ({
  OnboardingFlow: () => <div data-testid="onboarding-flow">Onboarding</div>,
}))

describe('OnboardingGate', () => {
  beforeEach(() => {
    fetchMyProfilePreferences.mockResolvedValue({
      ok: true,
      data: {
        show_entrance_screen: true,
        last_entrance_local_date: null,
        welcome_moment_seen_at: null,
        onboarding_completed_at: null,
        onboarding_step: null,
      },
    })
  })

  it('shows the welcome screen for founder accounts', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<OnboardingGate />}>
            <Route index element={<div data-testid="app-outlet">App</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByTestId('entrance-welcome')).toBeInTheDocument())
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument()
  })
})
