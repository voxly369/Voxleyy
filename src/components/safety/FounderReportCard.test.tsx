import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FounderReportCard } from './FounderReportCard.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

vi.mock('../../lib/safety/founderApi.ts', () => ({
  dismissReport: vi.fn().mockResolvedValue({ ok: true, data: null }),
  removeContent: vi.fn(),
  warnUser: vi.fn(),
  suspendUser: vi.fn(),
  banUser: vi.fn(),
}))

const row = {
  report_id: '00000000-0000-0000-0000-000000000099',
  reported_at: '2026-01-01T00:00:00.000Z',
  target_type: 'comment' as const,
  target_id: '00000000-0000-0000-0000-000000000001',
  reason: 'spam' as const,
  details: 'Please review',
  status: 'open' as const,
  reporter_id: '11111111-1111-1111-1111-111111111111',
  reporter_username: 'readerone',
  reporter_display_name: 'Reader',
  reported_user_id: '22222222-2222-2222-2222-222222222222',
  reported_username: 'writertwo',
  reported_display_name: 'Writer',
  reported_user_status: 'active' as const,
  prior_reports_against_user: 0,
  warnings_against_user: 0,
  moderation_actions_against_user: 0,
  target_snapshot: { body: 'Bad comment' },
}

describe('FounderReportCard', () => {
  it('opens dismiss reason modal', async () => {
    render(
      <MemoryRouter>
        <ModalStackProvider>
          <FounderReportCard row={row} onActionComplete={vi.fn()} />
        </ModalStackProvider>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.getByRole('heading', { name: 'Dismiss report' })).toBeInTheDocument()
  })
})
