import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MfaChallengeScreen } from './MfaChallengeScreen.tsx'

function renderChallenge(props: Parameters<typeof MfaChallengeScreen>[0]) {
  return render(
    <MemoryRouter>
      <MfaChallengeScreen {...props} />
    </MemoryRouter>,
  )
}

vi.mock('../../lib/auth/mfa/totp.ts', () => ({
  verifySignInTotp: vi.fn(async (code: string) =>
    code === '123456' ? { ok: true as const } : { ok: false as const, message: 'bad code' },
  ),
}))

describe('MfaChallengeScreen', () => {
  afterEach(() => cleanup())

  it('calls onSuccess after a valid code', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    renderChallenge({ onSuccess, onCancelSignOut: () => {} })
    const panel = within(screen.getByTestId('mfa-challenge-screen'))
    await user.type(panel.getByLabelText('Authenticator code'), '123456')
    await user.click(panel.getByRole('button', { name: 'Continue' }))
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows an error for a wrong code without password hints', async () => {
    const user = userEvent.setup()
    renderChallenge({ onSuccess: () => {}, onCancelSignOut: () => {} })
    const panel = within(screen.getByTestId('mfa-challenge-screen'))
    await user.type(panel.getByLabelText('Authenticator code'), '000000')
    await user.click(panel.getByRole('button', { name: 'Continue' }))
    expect(panel.getByRole('alert')).toHaveTextContent('bad code')
  })
})
