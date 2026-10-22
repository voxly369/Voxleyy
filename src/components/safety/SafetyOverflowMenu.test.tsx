import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SafetyOverflowMenu } from './SafetyOverflowMenu.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

vi.mock('../../lib/safety/blocksApi.ts', () => ({ blockUser: vi.fn().mockResolvedValue({ ok: true, data: null }) }))
vi.mock('../../lib/safety/mutesApi.ts', () => ({ muteUser: vi.fn().mockResolvedValue({ ok: true, data: null }) }))
vi.mock('../../lib/safety/reportsApi.ts', () => ({
  submitReport: vi.fn().mockResolvedValue({ ok: true, data: { id: 'r1' } }),
}))

const subject = {
  reportedUserId: '22222222-2222-2222-2222-222222222222',
  displayLabel: 'Writer',
  report: {
    targetType: 'profile' as const,
    targetId: '22222222-2222-2222-2222-222222222222',
    label: 'profile',
  },
}

describe('SafetyOverflowMenu', () => {
  it('opens block confirm dialog', async () => {
    render(
      <ModalStackProvider>
        <SafetyOverflowMenu subject={subject} />
      </ModalStackProvider>,
    )
    await userEvent.click(screen.getAllByTestId('safety-overflow-menu-trigger')[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Block' }))
    expect(screen.getByRole('alertdialog', { name: 'Block this account?' })).toBeInTheDocument()
  })

  it('opens mute confirm dialog', async () => {
    render(
      <ModalStackProvider>
        <SafetyOverflowMenu subject={subject} />
      </ModalStackProvider>,
    )
    await userEvent.click(screen.getAllByTestId('safety-overflow-menu-trigger')[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Mute' }))
    expect(screen.getByRole('alertdialog', { name: 'Mute this account?' })).toBeInTheDocument()
  })
})
