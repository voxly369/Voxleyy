import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteAccountModal } from './DeleteAccountModal.tsx'
import { AuthContext, type AuthContextValue } from '../../lib/auth/auth-context.ts'
vi.mock('../shell/Modal.tsx', () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}))

vi.mock('../../lib/account/dataExport.ts', () => ({
  exportMyData: vi.fn(async () => ({ ok: true as const, payload: { profile: {} } })),
  downloadJsonExport: vi.fn(),
  deleteMyAccount: vi.fn(async () => ({ ok: true as const })),
}))

const { signInWithPassword } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}))

vi.mock('../../lib/supabaseClient.ts', () => ({
  supabase: {
    auth: {
      signInWithPassword,
    },
  },
}))

function renderModal(overrides: Partial<AuthContextValue> = {}) {
  const value = {
    session: { user: { email: 'reader@example.com' } },
    profile: { username: 'readerone' },
    signOut: vi.fn(),
    ...overrides,
  } as AuthContextValue
  return render(
    <AuthContext.Provider value={value}>
      <DeleteAccountModal open onClose={() => {}} />
    </AuthContext.Provider>,
  )
}

describe('DeleteAccountModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    signInWithPassword.mockReset()
    signInWithPassword.mockResolvedValue({ error: null })
  })

  it('requires username confirmation and password before delete', async () => {
    const user = userEvent.setup()
    renderModal()
    const modal = within(screen.getByTestId('delete-account-modal'))
    const submit = modal.getByTestId('delete-account-submit')
    expect(submit).toBeDisabled()
    await user.type(modal.getByLabelText(/Re-enter your password/i), 'Str0ngPass!')
    await user.type(modal.getByTestId('delete-account-confirm-input'), 'readerone')
    expect(submit).not.toBeDisabled()
  })

  it('re-authenticates with password before calling delete', async () => {
    const user = userEvent.setup()
    renderModal()
    const modal = within(screen.getByTestId('delete-account-modal'))
    await user.type(modal.getByLabelText(/Re-enter your password/i), 'Str0ngPass!')
    await user.type(modal.getByTestId('delete-account-confirm-input'), 'readerone')
    await user.click(modal.getByTestId('delete-account-submit'))
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'reader@example.com',
        password: 'Str0ngPass!',
      }),
    )
  })
})
