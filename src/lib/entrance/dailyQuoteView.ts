import { SIGNATURE_QUOTE } from '../../config/brand.ts'
import { supabase } from '../supabaseClient.ts'

export type DailyQuoteView = {
  text: string
  author: string
  source: string | null
}

export function signatureDailyQuote(): DailyQuoteView {
  return { text: SIGNATURE_QUOTE.text, author: SIGNATURE_QUOTE.attribution, source: null }
}

function parseQuoteRpc(data: unknown): DailyQuoteView | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const row = data as Record<string, unknown>
  if (typeof row.text !== 'string' || typeof row.author !== 'string') return null
  return {
    text: row.text,
    author: row.author,
    source: typeof row.source === 'string' ? row.source : null,
  }
}

export async function fetchDailyQuoteForDay(day: string, timeZone: string): Promise<DailyQuoteView> {
  try {
    const { data, error } = await supabase.rpc('quote_of_the_day', { p_day: day, p_tz: timeZone })
    if (error) return signatureDailyQuote()
    return parseQuoteRpc(data) ?? signatureDailyQuote()
  } catch {
    return signatureDailyQuote()
  }
}
