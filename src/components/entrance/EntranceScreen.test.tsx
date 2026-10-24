import type { ComponentProps } from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup, waitFor } from '@testing-library/react'
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
      username: 'sam',
      display_name: 'Sam',
      country: 'ZA',
      timezone: 'UTC',
      role: 'reader',
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
      if (name === 'quote_of_the_day') {
        return { data: { text: 'Quiet ink.', author: 'Voxly', source: null } }
      }
      if (name === 'writing_prompt_for_date') return { data: 'Threshold' }
      return { data: null }
    }),
  },
}))

vi.mock('../../lib/library/listLibrary.ts', () => ({
  listContinueReading: vi.fn(async () => ({ ok: true, items: [] })),
}))

function renderEntrance(props: Partial<ComponentProps<typeof EntranceScreen>> = {}) {
  const onFinished = vi.fn()
  render(
    <MemoryRouter>
      <ModalStackProvider>
        <CreateSheetProvider>
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
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('exposes greeting in aria-live region', async () => {
    renderEntrance()
    expect(await screen.findByTestId('entrance-screen')).toBeInTheDocument()
    const live = document.querySelector('[aria-live="polite"]')
    expect(live).toBeTruthy()
    expect(live).toHaveTextContent(/Sam|Good/)
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
    expect(patchMyProfilePreferences).toHaveBeenCalled()
  })

  it('schedules auto-continue when motion is allowed', async () => {
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
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 8000)
    timeoutSpy.mockRestore()
  })

  it('does not schedule auto-continue when reduced motion is preferred', async () => {
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
    const timeoutSpy = vi.spyOn(window, 'setTimeout')
    renderEntrance()
    await screen.findByTestId('entrance-screen')
    expect(timeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 8000)
    timeoutSpy.mockRestore()
  })

})
