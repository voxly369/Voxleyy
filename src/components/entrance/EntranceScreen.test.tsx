import type { ComponentProps } from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EntranceScreen } from './EntranceScreen.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { CreateSheetProvider } from '../../lib/shell/CreateSheetProvider.tsx'

const patchMyProfilePreferences = vi.fn(async () => ({ ok: true, data: {} }))

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      username: 'silentwriter',
      display_name: 'the silent writer',
      country: 'ZA',
      timezone: 'UTC',
      role: 'writer',
    },
  }),
}))

vi.mock('../../lib/onboarding/api.ts', () => ({
  patchMyProfilePreferences: (...args: unknown[]) => patchMyProfilePreferences(...args),
}))

vi.mock('../../lib/supabaseClient.ts', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-1' } } } })),
    },
    rpc: vi.fn(async (name: string) => {
      if (name === 'writing_prompt_for_date') return { data: 'Threshold' }
      return { data: null }
    }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

vi.mock('../../lib/streaks/api.ts', () => ({
  getUserStreaks: vi.fn(async () => ({
    ok: true,
    data: {
      writing: { current: 0, longest: 0, lastActiveDay: null },
      reading: { current: 0, longest: 0, lastActiveDay: null },
    },
  })),
}))

vi.mock('../../lib/streaks/liveCurrentStreak.ts', () => ({
  liveCurrentStreak: () => 0,
}))

vi.mock('../../config/brand.ts', () => ({
  SIGNATURE_QUOTE: { text: 'Quote', attribution: 'Voxly' },
  entranceMusic: null,
}))

function renderEntrance(props: Partial<ComponentProps<typeof EntranceScreen>> = {}) {
  const onFinished = vi.fn()
  render(
    <MemoryRouter>
      <ModalStackProvider>
        <CreateSheetProvider>
          <div id="main" tabIndex={-1} />
          <EntranceScreen
            serverLastEntranceDate={null}
            showEntranceScreen
            firstEntranceEver={false}
            onFinished={onFinished}
            {...props}
          />
        </CreateSheetProvider>
      </ModalStackProvider>
    </MemoryRouter>,
  )
  return { onFinished }
}

describe('EntranceScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    patchMyProfilePreferences.mockClear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('exposes greeting in aria-live region', async () => {
    renderEntrance()
    expect(await screen.findByTestId('entrance-screen')).toBeInTheDocument()
    const live = document.querySelector('[aria-live="polite"]')
    expect(live).toHaveTextContent(/Good evening|silent writer/i)
  })

  it('shows swipe hint and step inside control', async () => {
    renderEntrance()
    await screen.findByTestId('entrance-screen')
    expect(screen.getByTestId('entrance-swipe-hint')).toHaveTextContent(/Swipe to step inside/i)
    expect(screen.getByTestId('entrance-step-inside')).toHaveAccessibleName(/Step inside/i)
  })

  it('dismisses on Escape', async () => {
    const user = userEvent.setup()
    const { onFinished } = renderEntrance()
    await screen.findByTestId('entrance-screen')
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByTestId('entrance-screen')).not.toBeInTheDocument()
    })
    expect(onFinished).toHaveBeenCalled()
  })

  it('dismisses on Enter key', async () => {
    const user = userEvent.setup()
    const { onFinished } = renderEntrance()
    await screen.findByTestId('entrance-screen')
    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(screen.queryByTestId('entrance-screen')).not.toBeInTheDocument()
    })
    expect(onFinished).toHaveBeenCalled()
  })

  it('does not auto-dismiss with a timer when motion is allowed', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
    const timeoutSpy = vi.spyOn(window, 'setTimeout')
    renderEntrance()
    await screen.findByTestId('entrance-screen')
    expect(timeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 8000)
    timeoutSpy.mockRestore()
  })

  it('hides music controls when no track is configured', async () => {
    renderEntrance()
    await screen.findByTestId('entrance-screen')
    expect(screen.queryByTestId('entrance-music-mute')).not.toBeInTheDocument()
  })
})
