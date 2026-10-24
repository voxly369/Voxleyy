import { supabase } from '../supabaseClient.ts'

export type FounderDailyQuoteRow = {
  id: string
  text: string
  author: string
  source: string | null
  active: boolean
  kind: 'public_domain' | 'original' | 'owner'
  createdAt: string
}

function parseRow(raw: unknown): FounderDailyQuoteRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : null
  if (!id) return null
  const kind = row.kind
  if (kind !== 'public_domain' && kind !== 'original' && kind !== 'owner') return null
  return {
    id,
    text: typeof row.text === 'string' ? row.text : '',
    author: typeof row.author === 'string' ? row.author : '',
    source: typeof row.source === 'string' ? row.source : null,
    active: row.active !== false,
    kind,
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  }
}

export async function founderListDailyQuotes(input: {
  cursor?: string | null
}): Promise<{ ok: true; rows: FounderDailyQuoteRow[]; nextCursor: string | null } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('founder_list_daily_quotes', {
    p_cursor: input.cursor ?? undefined,
    p_limit: 50,
  })
  if (error) return { ok: false, message: error.message ?? 'Could not load quotes.' }
  const payload = data as unknown as { rows?: unknown[]; next_cursor?: string | null } | null
  const rows = (payload?.rows ?? []).flatMap((row) => {
    const parsed = parseRow(row)
    return parsed ? [parsed] : []
  })
  const nextCursor = typeof payload?.next_cursor === 'string' ? payload.next_cursor : null
  return { ok: true, rows, nextCursor }
}

export async function founderUpsertDailyQuote(input: {
  id?: string | null
  text?: string
  author?: string
  source?: string | null
  kind?: 'public_domain' | 'original' | 'owner'
  active?: boolean
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('founder_upsert_daily_quote', {
    p_id: input.id ?? undefined,
    p_text: input.text ?? undefined,
    p_author: input.author ?? undefined,
    p_source: input.source ?? undefined,
    p_kind: input.kind ?? undefined,
    p_active: input.active ?? undefined,
  })
  if (error) return { ok: false, message: error.message ?? 'Could not save quote.' }
  const id = typeof data === 'string' ? data : String(data ?? '')
  if (!id) return { ok: false, message: 'Could not save quote.' }
  return { ok: true, id }
}

export async function founderActiveDailyQuoteCount(): Promise<number> {
  const { data, error } = await supabase.rpc('founder_active_daily_quote_count')
  if (error) return 0
  return typeof data === 'number' ? data : Number(data) || 0
}
