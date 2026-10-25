import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FounderPage from './FounderPage.tsx'
import { ModalStackProvider } from '../lib/shell/modalStack.tsx'

vi.mock('../lib/founder/feedback.ts', () => ({
  founderFeedbackUnreadCount: vi.fn(async () => 3),
  founderListFeedback: vi.fn(async () => ({ ok: true, rows: [], nextCursor: null })),
  founderUpdateFeedback: vi.fn(async () => ({ ok: true })),
}))

vi.mock('../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ profile: { role: 'founder' }, user: { id: 'founder' } }),
}))

vi.mock('../components/founder/FounderAnalyticsPanel.tsx', () => ({
  FounderAnalyticsPanel: () => <div data-testid="founder-analytics-stub" />,
}))

describe('FounderPage feedback tab label', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.stubGlobal('location', { ...window.location, search: '?tab=feedback' })
  })

  it('shows unread count on the Feedback tab', async () => {
    render(
      <MemoryRouter initialEntries={['/founder?tab=feedback']}>
        <ModalStackProvider>
          <FounderPage />
        </ModalStackProvider>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('founder-tab-feedback')).toHaveTextContent('Feedback (3)')
    })
  })
})
