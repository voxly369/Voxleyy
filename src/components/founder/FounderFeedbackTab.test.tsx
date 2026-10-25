import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

const sampleRow = {
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
}

describe('FounderFeedbackTab', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    founderListFeedback.mockResolvedValue({ ok: true, rows: [sampleRow], nextCursor: null })
    founderFeedbackUnreadCount.mockResolvedValue(1)
    founderUpdateFeedback.mockResolvedValue({ ok: true })
  })

  it('shows loading then populated list', async () => {
    render(<FounderFeedbackTab />)
    expect(screen.getByText(/Loading/)).toBeInTheDocument()
    expect(await screen.findByText(/Great reading flow/)).toBeInTheDocument()
    expect(screen.getByTestId('founder-feedback-unread')).toHaveTextContent('1 unread')
  })

  it('shows empty state', async () => {
    founderListFeedback.mockResolvedValue({ ok: true, rows: [], nextCursor: null })
    founderFeedbackUnreadCount.mockResolvedValue(0)
    render(<FounderFeedbackTab />)
    expect(await screen.findByTestId('founder-feedback-empty')).toBeInTheDocument()
  })

  it('shows error with Retry', async () => {
    founderListFeedback
      .mockResolvedValueOnce({ ok: false, message: 'Could not load feedback.' })
      .mockResolvedValue({ ok: true, rows: [sampleRow], nextCursor: null })
    render(<FounderFeedbackTab />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load feedback/)
    await userEvent.setup().click(screen.getByTestId('founder-feedback-retry'))
    await waitFor(() => expect(screen.getByText(/Great reading flow/)).toBeInTheDocument())
  })

  it('marks read and done', async () => {
    const user = userEvent.setup()
    render(<FounderFeedbackTab />)
    await screen.findByText(/Great reading flow/)
    await user.click(screen.getByRole('button', { name: 'Mark read' }))
    await waitFor(() => expect(founderUpdateFeedback).toHaveBeenCalledWith({ id: 1, read: true }))
    await user.click(screen.getByTestId('founder-feedback-mark-done'))
    await waitFor(() => expect(founderUpdateFeedback).toHaveBeenCalledWith({ id: 1, done: true, read: true }))
  })
})
