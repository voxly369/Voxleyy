import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { WarningModal } from './WarningModal.tsx'

vi.mock('../../lib/safety/warningsApi.ts', () => ({
  listUnseenWarnings: vi.fn(),
  markWarningSeen: vi.fn(),
}))

import { listUnseenWarnings, markWarningSeen } from '../../lib/safety/warningsApi.ts'

describe('WarningModal', () => {
  beforeEach(() => {
    vi.mocked(listUnseenWarnings).mockReset()
    vi.mocked(markWarningSeen).mockReset()
  })

  it('shows once and I understand calls markWarningSeen', async () => {
    vi.mocked(listUnseenWarnings).mockResolvedValue({
      ok: true,
      data: [{ id: 'w1', message: 'Community warning', createdAt: '2026-01-01T00:00:00Z', seenAt: null }],
    })
    vi.mocked(markWarningSeen).mockResolvedValue({ ok: true, data: null })

    render(
      <ModalStackProvider>
        <WarningModal />
      </ModalStackProvider>,
    )
    expect(await screen.findByTestId('warning-modal')).toBeInTheDocument()
    expect(screen.getByText('Community warning')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'I understand' }))
    await waitFor(() => expect(markWarningSeen).toHaveBeenCalledWith('w1'))
  })

  it('does not render when no unseen warnings', async () => {
    vi.mocked(listUnseenWarnings).mockResolvedValue({ ok: true, data: [] })
    render(
      <ModalStackProvider>
        <WarningModal />
      </ModalStackProvider>,
    )
    await waitFor(() => expect(listUnseenWarnings).toHaveBeenCalled())
    expect(screen.queryByTestId('warning-modal')).not.toBeInTheDocument()
  })
})
