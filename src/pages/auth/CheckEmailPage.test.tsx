import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CheckEmailPage from './CheckEmailPage.tsx'

const resendConfirmation = vi.fn(async () => ({ ok: true as const }))

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ resendConfirmation }),
}))

vi.mock('../../lib/signup/resendLimits.ts', () => ({
  canResendConfirmation: () => true,
  recordResendConfirmation: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/check-email', state: { email: 'reader@example.com' } }]}>
      <Routes>
        <Route path="/check-email" element={<CheckEmailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CheckEmailPage', () => {
  afterEach(() => {
    cleanup()
    resendConfirmation.mockClear()
  })

  it('masks the email address', () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/reader@example\.com|r\*\*\*@/)
  })

  it('calls resend on button click', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTestId('check-email-resend'))
    expect(resendConfirmation).toHaveBeenCalledWith('reader@example.com')
  })
})
