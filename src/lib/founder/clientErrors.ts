import { supabase } from '../supabaseClient.ts'

export type FounderClientErrorGroup = {
  message: string
  count: number
  lastSeen: string
  dismissed: boolean
}

export async function founderClientErrorsGrouped(
  limit = 50,
): Promise<{ ok: true; rows: FounderClientErrorGroup[] } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('founder_client_errors_grouped', { p_limit: limit })
  if (error) return { ok: false, message: error.message || 'Could not load client errors.' }
  if (!Array.isArray(data)) return { ok: true, rows: [] }
  const rows: FounderClientErrorGroup[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const message = typeof row.message === 'string' ? row.message : null
    if (!message) continue
    rows.push({
      message,
      count: typeof row.count === 'number' ? row.count : 0,
      lastSeen: typeof row.last_seen === 'string' ? row.last_seen : '',
      dismissed: row.dismissed === true,
    })
  }
  return { ok: true, rows }
}

export async function founderDismissClientError(message: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('founder_dismiss_client_error', { p_message: message })
  if (error) return { ok: false, message: error.message || 'Could not dismiss that error.' }
  return { ok: true }
}
