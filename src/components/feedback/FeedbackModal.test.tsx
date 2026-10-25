import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FeedbackModal } from './FeedbackModal.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { ToastProvider } from '../shell/ToastProvider.tsx'

const submitAppFeedback = vi.fn()

vi.mock('../../lib/feedback/api.ts', () => ({
  submitAppFeedback: (...args: unknown[]) => submitAppFeedback(...args),
}))

function renderModal() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ModalStackProvider>
          <FeedbackModal open onClose={() => {}} />
        </ModalStackProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('FeedbackModal', () => {
  beforeEach(() => {
    submitAppFeedback.mockResolvedValue({ ok: true })
  })

  it('submits trimmed feedback', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByTestId('feedback-message'), 'This is enough text for feedback.')
    await user.click(screen.getByTestId('feedback-submit'))
    await waitFor(() => {
      expect(submitAppFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'idea', message: 'This is enough text for feedback.' }),
      )
    })
  })
})
