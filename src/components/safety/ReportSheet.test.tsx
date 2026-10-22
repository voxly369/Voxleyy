import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReportSheet } from './ReportSheet.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

vi.mock('../../lib/safety/reportsApi.ts', () => ({
  submitReport: vi.fn(),
}))

import { submitReport } from '../../lib/safety/reportsApi.ts'

const target = {
  targetType: 'post' as const,
  targetId: '00000000-0000-0000-0000-000000000001',
  reportedUserId: '22222222-2222-2222-2222-222222222222',
  label: 'post',
}

function renderSheet() {
  return render(
    <ModalStackProvider>
      <ReportSheet open target={target} onClose={vi.fn()} />
    </ModalStackProvider>,
  )
}

describe('ReportSheet', () => {
  it('shows success state after submit', async () => {
    vi.mocked(submitReport).mockResolvedValue({ ok: true, data: { id: 'r1' } })
    renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }))
    expect(await screen.findByTestId('report-sheet-success')).toBeInTheDocument()
  })

  it('shows duplicate state', async () => {
    vi.mocked(submitReport).mockResolvedValue({
      ok: false,
      error: { code: 'duplicate', message: 'You already reported this' },
    })
    renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }))
    expect(await screen.findByTestId('report-sheet-duplicate')).toBeInTheDocument()
  })
})
