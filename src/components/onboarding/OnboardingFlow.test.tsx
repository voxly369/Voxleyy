import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingFlow } from './OnboardingFlow.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { CreateSheetProvider } from '../../lib/shell/CreateSheetProvider.tsx'

const fetchMyProfilePreferences = vi.fn()
const patchMyProfilePreferences = vi.fn()
const completeMyOnboarding = vi.fn()

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      username: 'sam',
      display_name: 'Sam',
      country: 'ZA',
      timezone: 'UTC',
    },
  }),
}))

vi.mock('../../lib/onboarding/api.ts', () => ({
  fetchMyProfilePreferences: (...args: unknown[]) => fetchMyProfilePreferences(...args),
  patchMyProfilePreferences: (...args: unknown[]) => patchMyProfilePreferences(...args),
  completeMyOnboarding: (...args: unknown[]) => completeMyOnboarding(...args),
}))

vi.mock('../../lib/notifications/api.ts', () => ({
  detectBrowserTimezone: () => 'UTC',
  fetchNotificationSettings: vi.fn(async () => ({ ok: true, data: { quiet_enabled: false } })),
  updateNotificationSettings: vi.fn(async () => ({ ok: true })),
}))

vi.mock('../../lib/shell/rightRailData.ts', () => ({
  fetchSuggestedWriters: vi.fn(async () => ({ ok: true, writers: [] })),
}))

vi.mock('../../lib/profiles/api.ts', () => ({
  followUser: vi.fn(async () => ({ ok: true })),
}))

vi.mock('../../lib/supabaseClient.ts', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [] }),
      }),
    }),
    rpc: vi.fn(async () => ({ data: 'Write something true.' })),
  },
}))

function renderFlow(onFinished = vi.fn()) {
  render(
    <MemoryRouter>
      <ModalStackProvider>
        <CreateSheetProvider>
          <OnboardingFlow onFinished={onFinished} />
        </CreateSheetProvider>
      </ModalStackProvider>
    </MemoryRouter>,
  )
  return onFinished
}

describe('OnboardingFlow', () => {
  beforeEach(() => {
    cleanup()
    fetchMyProfilePreferences.mockResolvedValue({
      ok: true,
      data: {
        user_id: 'user-1',
        onboarding_completed_at: null,
        onboarding_step: 0,
        writer_roles: [],
        favorite_genres: [],
        languages: ['en'],
        welcome_moment_seen_at: null,
        last_entrance_local_date: null,
        show_entrance_screen: true,
        checklist_dismissed_at: null,
        checklist_progress: {},
      },
    })
    patchMyProfilePreferences.mockResolvedValue({
      ok: true,
      data: {
        user_id: 'user-1',
        onboarding_completed_at: null,
        onboarding_step: 1,
        writer_roles: [],
        favorite_genres: [],
        languages: ['en'],
        welcome_moment_seen_at: null,
        last_entrance_local_date: null,
        show_entrance_screen: true,
        checklist_dismissed_at: null,
        checklist_progress: {},
      },
    })
    completeMyOnboarding.mockResolvedValue({
      ok: true,
      data: {
        user_id: 'user-1',
        onboarding_completed_at: '2026-01-02T00:00:00.000Z',
        onboarding_step: 99,
        writer_roles: [],
        favorite_genres: [],
        languages: ['en'],
        welcome_moment_seen_at: null,
        last_entrance_local_date: null,
        show_entrance_screen: true,
        checklist_dismissed_at: null,
        checklist_progress: {},
      },
    })
  })

  it('shows step 1 and continues on Continue', async () => {
    const user = userEvent.setup()
    renderFlow()
    expect(await screen.findByTestId('onboarding-flow')).toBeInTheDocument()
    expect(screen.getByTestId('onboarding-step-label')).toHaveTextContent('Step 1 of 7')
    await user.click(screen.getByTestId('onboarding-continue'))
    expect(patchMyProfilePreferences).toHaveBeenCalled()
  })

  it('skip advances to the next step label', async () => {
    const user = userEvent.setup()
    renderFlow()
    await screen.findByTestId('onboarding-flow')
    await user.click(screen.getByTestId('onboarding-skip'))
    expect(screen.getByTestId('onboarding-step-label')).toHaveTextContent('Step 2 of 7')
  })
})
