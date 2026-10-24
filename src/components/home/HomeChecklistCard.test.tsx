import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HomeChecklistCard } from './HomeChecklistCard.tsx'

const openFeedback = vi.fn()

vi.mock('../../lib/shell/FeedbackProvider.tsx', () => ({
  useFeedback: () => ({ openFeedback }),
}))

const baseSignals = {
  hasBio: false,
  postCount: 0,
  followCount: 0,
  librarySaveCount: 0,
  readingProgressCount: 0,
  feedbackSent: false,
}

describe('HomeChecklistCard', () => {
  it('renders progress and opens feedback from Send', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <HomeChecklistCard signals={baseSignals} dismissed={false} onDismiss={onDismiss} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-checklist')).toBeInTheDocument()
    expect(screen.getByText(/0 of 6 complete/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(openFeedback).toHaveBeenCalled()
  })

  it('returns null when dismissed', () => {
    const { container } = render(
      <MemoryRouter>
        <HomeChecklistCard signals={baseSignals} dismissed onDismiss={() => {}} />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
