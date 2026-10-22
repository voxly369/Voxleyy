import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProfileBadgesPage from '../../pages/ProfileBadgesPage.tsx'

const pinBadge = vi.fn()
const unpinBadge = vi.fn()

vi.mock('../../lib/profiles/api.ts', () => ({
  getProfileByUsername: vi.fn(async () => ({
    ok: true,
    data: {
      id: 'user-1',
      username: 'writerone',
      displayName: 'Writer',
      role: 'writer',
    },
  })),
}))

vi.mock('../../lib/badges/api.ts', () => ({
  badgeProgressForUser: vi.fn(async () => ({
    ok: true,
    data: [
      { key: 'poet', current: 5, goal: 5, earned: true },
      { key: 'storyteller', current: 1, goal: 5, earned: false },
    ],
  })),
  listUserBadgesPublic: vi.fn(async () => ({ ok: true, data: [] })),
  listPinnedBadges: vi.fn(async () => ({ ok: true, data: [{ badgeKey: 'poet', iconKey: 'quill', name: 'Poet', position: 1 }] })),
  pinBadge: (...args: unknown[]) => pinBadge(...args),
  unpinBadge: (...args: unknown[]) => unpinBadge(...args),
}))

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ profile: { id: 'user-1', username: 'writerone' } }),
}))

vi.mock('../../lib/shell/useToast.ts', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

describe('ProfileBadgesPage pin limit', () => {
  beforeEach(() => {
    pinBadge.mockReset()
    unpinBadge.mockReset()
    pinBadge.mockResolvedValue({ ok: false, error: { code: 'invalid', message: 'You can pin up to 3 badges. Unpin one first.' } })
  })

  it('surfaces pin limit errors from the API', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/u/writerone/badges']}>
        <Routes>
          <Route path="/u/:username/badges" element={<ProfileBadgesPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('profile-badges-page')).toBeInTheDocument())
    unpinBadge.mockResolvedValue({ ok: true, data: null })
    await user.click(screen.getByTestId('pin-badge-poet'))
    expect(unpinBadge).toHaveBeenCalledWith('poet')
  })
})
