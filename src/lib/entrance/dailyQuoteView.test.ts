import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SIGNATURE_QUOTE } from '../../config/brand.ts'
import { fetchDailyQuoteForDay, signatureDailyQuote } from './dailyQuoteView.ts'

const rpc = vi.fn()

vi.mock('../supabaseClient.ts', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}))

describe('fetchDailyQuoteForDay', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('returns the built-in quote when RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const quote = await fetchDailyQuoteForDay('2026-06-01', 'UTC')
    expect(quote.text).toBe(SIGNATURE_QUOTE.text)
    expect(quote.author).toBe(SIGNATURE_QUOTE.attribution)
  })

  it('returns the built-in quote when RPC data is empty', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    const quote = await fetchDailyQuoteForDay('2026-06-01', 'UTC')
    expect(quote).toEqual(signatureDailyQuote())
  })

  it('returns RPC quote when valid', async () => {
    rpc.mockResolvedValue({
      data: { text: 'Quiet ink.', author: 'Voxly', source: null },
      error: null,
    })
    const quote = await fetchDailyQuoteForDay('2026-06-01', 'UTC')
    expect(quote.text).toBe('Quiet ink.')
    expect(quote.author).toBe('Voxly')
  })
})
