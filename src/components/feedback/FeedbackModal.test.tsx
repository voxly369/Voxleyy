import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FeedbackModal } from './FeedbackModal.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { ToastProvider } from '../shell/ToastProvider.tsx'

const submitAppFeedback = vi.fn()
const showToast = vi.fn()

vi.mock('../../lib/feedback/api.ts', () => ({
  submitAppFeedback: (...args: unknown[]) => submitAppFeedback(...args),
}))

vi.mock('../../lib/shell/useToast.ts', () => ({
  useToast: () => ({ showToast }),
}))

const VALID_MESSAGE = 'This is valid feedback with enough characters.'

function setMessage(value: string) {
  fireEvent.change(screen.getByTestId('feedback-message'), { target: { value } })
}

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ModalStackProvider>
          <FeedbackModal open onClose={onClose} />
        </ModalStackProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('FeedbackModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    submitAppFeedback.mockReset()
    showToast.mockReset()
    submitAppFeedback.mockResolvedValue({ ok: true })
  })

  it('shows idle form controls', () => {
    renderModal()
    expect(screen.getByTestId('feedback-modal')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-submit')).toHaveTextContent('Send')
    expect(screen.getByTestId('feedback-submit')).not.toBeDisabled()
  })

  it('shows validation for a 9-character message', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByTestId('feedback-message'), '123456789')
    await user.click(screen.getByTestId('feedback-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 10 characters/i)
    expect(submitAppFeedback).not.toHaveBeenCalled()
  })

  it('rejects a 2,001-character message', async () => {
    renderModal()
    const textarea = screen.getByTestId('feedback-message')
    fireEvent.change(textarea, { target: { value: `${'a'.repeat(2000)}b` } })
    fireEvent.click(screen.getByTestId('feedback-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/2000|characters/i)
    expect(submitAppFeedback).not.toHaveBeenCalled()
  })

  it('shows submitting state while the request is in flight', async () => {
    const user = userEvent.setup()
    let resolve!: (value: unknown) => void
    submitAppFeedback.mockReturnValue(new Promise((r) => {
      resolve = r
    }))
    renderModal()
    setMessage(VALID_MESSAGE)
    await user.click(screen.getByTestId('feedback-submit'))
    expect(screen.getByTestId('feedback-submit')).toHaveTextContent('Sending…')
    expect(screen.getByTestId('feedback-submit')).toBeDisabled()
    resolve({ ok: true })
    await waitFor(() => expect(screen.getByTestId('feedback-submit')).toHaveTextContent('Send'))
  })

  it('shows success toast and closes on submit', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal(onClose)
    setMessage(VALID_MESSAGE)
    await user.click(screen.getByTestId('feedback-submit'))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Thank you, the Founder will read this.')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows rate limited message from the API', async () => {
    const user = userEvent.setup()
    submitAppFeedback.mockResolvedValue({
      ok: false,
      message: 'You can send up to 10 pieces of feedback per day.',
    })
    renderModal()
    setMessage(VALID_MESSAGE)
    await user.click(screen.getByTestId('feedback-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/10 pieces of feedback/)
    expect(screen.getByTestId('feedback-retry')).toBeInTheDocument()
  })

  it('shows network error with Retry', async () => {
    const user = userEvent.setup()
    submitAppFeedback.mockResolvedValueOnce({ ok: false, message: 'Network error. Try again.' })
    submitAppFeedback.mockResolvedValueOnce({ ok: true })
    renderModal()
    setMessage(VALID_MESSAGE)
    await user.click(screen.getByTestId('feedback-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Network error/)
    await user.click(screen.getByTestId('feedback-retry'))
    await waitFor(() => expect(submitAppFeedback).toHaveBeenCalledTimes(2))
  })
})
