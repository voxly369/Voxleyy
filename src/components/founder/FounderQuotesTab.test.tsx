import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FounderQuotesTab } from './FounderQuotesTab.tsx'

const founderListDailyQuotes = vi.fn()
const founderActiveDailyQuoteCount = vi.fn()
const founderUpsertDailyQuote = vi.fn()

vi.mock('../../lib/founder/dailyQuotes.ts', () => ({
  founderListDailyQuotes: (...args: unknown[]) => founderListDailyQuotes(...args),
  founderActiveDailyQuoteCount: (...args: unknown[]) => founderActiveDailyQuoteCount(...args),
  founderUpsertDailyQuote: (...args: unknown[]) => founderUpsertDailyQuote(...args),
}))

describe('FounderQuotesTab', () => {
  beforeEach(() => {
    cleanup()
    founderListDailyQuotes.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: 'q1',
          text: 'Seed quote',
          author: 'Voxly',
          source: null,
          active: true,
          kind: 'original',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      nextCursor: null,
    })
    founderActiveDailyQuoteCount.mockResolvedValue(120)
    founderUpsertDailyQuote.mockResolvedValue({ ok: true, id: 'q2' })
  })

  it('lists quotes and shows active count', async () => {
    render(<FounderQuotesTab />)
    expect(await screen.findByTestId('founder-quotes-tab')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/120 active/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Seed quote/)).toBeInTheDocument()
  })

  it('submits a new quote from the add form', async () => {
    const user = userEvent.setup()
    render(<FounderQuotesTab />)
    await screen.findByTestId('founder-quotes-add')
    await user.type(screen.getByTestId('founder-quotes-text'), 'A new line for testers.')
    await user.type(screen.getByTestId('founder-quotes-author'), 'Sam')
    await user.click(screen.getByTestId('founder-quotes-save'))
    await waitFor(() => {
      expect(founderUpsertDailyQuote).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'A new line for testers.', author: 'Sam', active: true }),
      )
    })
  })
})
