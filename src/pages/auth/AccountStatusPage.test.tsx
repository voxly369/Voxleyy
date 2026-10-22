import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountStatusPage } from './AccountStatusPage.tsx'

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ signOut: vi.fn(), profile: { status: 'banned' } }),
}))
vi.mock('../../lib/safety/accountRestriction.ts', () => ({
  myAccountRestriction: vi.fn().mockResolvedValue({
    ok: true,
    data: { status: 'banned', statusReason: 'Repeated spam', suspendedUntil: null },
  }),
}))
vi.mock('../../lib/safety/appealsApi.ts', () => ({
  submitAppeal: vi.fn(),
}))

describe('AccountStatusPage', () => {
  it('shows banned screen with reason', async () => {
    render(<AccountStatusPage />)
    expect(screen.getByTestId('account-banned')).toBeInTheDocument()
    expect(await screen.findByText('Repeated spam')).toBeInTheDocument()
  })
})
