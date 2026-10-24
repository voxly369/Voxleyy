import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { ConsentReacceptModal } from './ConsentReacceptModal.tsx'

vi.mock('../../lib/consent/recordConsent.ts', () => ({
  recordUserConsents: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('ConsentReacceptModal', () => {
  it('requires checkbox before submit', async () => {
    const onAccepted = vi.fn()
    render(
      <MemoryRouter>
        <ModalStackProvider>
          <ConsentReacceptModal open documents={['terms', 'privacy']} onAccepted={onAccepted} />
        </ModalStackProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('consent-reaccept-modal')).toBeInTheDocument()
    const submit = screen.getByTestId('consent-reaccept-submit')
    expect(submit).toBeDisabled()
    await userEvent.click(screen.getByTestId('consent-reaccept-checkbox'))
    await userEvent.click(submit)
    expect(onAccepted).toHaveBeenCalled()
  })
})
