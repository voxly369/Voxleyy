import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FounderFeedbackTab } from './FounderFeedbackTab.tsx'

const founderListFeedback = vi.fn()
const founderFeedbackUnreadCount = vi.fn()
const founderUpdateFeedback = vi.fn()

vi.mock('../../lib/founder/feedback.ts', () => ({
  founderListFeedback: (...args: unknown[]) => founderListFeedback(...args),
  founderFeedbackUnreadCount: (...args: unknown[]) => founderFeedbackUnreadCount(...args),
  founderUpdateFeedback: (...args: unknown[]) => founderUpdateFeedback(...args),
}))

describe('FounderFeedbackTab', () => {
  beforeEach(() => {
    cleanup()
    founderListFeedback.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: 1,
          user_id: '11111111-1111-1111-1111-111111111111',
          category: 'idea',
          message: 'Great reading flow.',
          page_path: '/home',
          app_version: '0.0.0',
          viewport: '800x600',
          read_at: null,
          done_at: null,
          founder_note: null,
          created_at: '2026-01-02T12:00:00.000Z',
        },
      ],
      nextCursor: null,
    })
    founderFeedbackUnreadCount.mockResolvedValue(1)
    founderUpdateFeedback.mockResolvedValue({ ok: true })
  })

  it('lists feedback and marks done', async () => {
    const user = userEvent.setup()
    render(<FounderFeedbackTab />)
    expect(await screen.findByTestId('founder-feedback-tab')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Great reading flow/)).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('founder-feedback-mark-done'))
    await waitFor(() => {
      expect(founderUpdateFeedback).toHaveBeenCalledWith({ id: 1, done: true, read: true })
    })
  })
})
