import { supabase } from '../supabaseClient.ts'

export type FounderFeedbackRow = {
  id: number
  userId: string
  category: string
  message: string
  pagePath: string | null
  appVersion: string | null
  viewport: string | null
  readAt: string | null
  doneAt: string | null
  founderNote: string | null
  createdAt: string
}

function parseRow(raw: unknown): FounderFeedbackRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = Number(row.id)
  if (!Number.isFinite(id)) return null
  const userId = typeof row.user_id === 'string' ? row.user_id : null
  if (!userId) return null
  return {
    id,
    userId,
    category: typeof row.category === 'string' ? row.category : '',
    message: typeof row.message === 'string' ? row.message : '',
    pagePath: typeof row.page_path === 'string' ? row.page_path : null,
    appVersion: typeof row.app_version === 'string' ? row.app_version : null,
    viewport: typeof row.viewport === 'string' ? row.viewport : null,
    readAt: typeof row.read_at === 'string' ? row.read_at : null,
    doneAt: typeof row.done_at === 'string' ? row.done_at : null,
    founderNote: typeof row.founder_note === 'string' ? row.founder_note : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  }
}

export async function founderListFeedback(input: {
  category?: string | null
  cursor?: string | null
}): Promise<{ ok: true; rows: FounderFeedbackRow[]; nextCursor: string | null } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('founder_list_feedback', {
    p_category: input.category ?? undefined,
    p_cursor: input.cursor ?? undefined,
    p_limit: 25,
  })
  if (error) return { ok: false, message: error.message ?? 'Could not load feedback.' }
  const payload = data as unknown as { rows?: unknown[]; next_cursor?: string | null } | null
  const rows = (payload?.rows ?? []).flatMap((row) => {
    const parsed = parseRow(row)
    return parsed ? [parsed] : []
  })
  const nextCursor = typeof payload?.next_cursor === 'string' ? payload.next_cursor : null
  return { ok: true, rows, nextCursor }
}

export async function founderFeedbackUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('founder_feedback_unread_count')
  if (error) return 0
  return typeof data === 'number' ? data : Number(data) || 0
}

export async function founderUpdateFeedback(input: {
  id: number
  read?: boolean
  done?: boolean
  note?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('founder_update_feedback', {
    p_id: input.id,
    p_read: input.read ?? null,
    p_done: input.done ?? null,
    p_note: input.note ?? null,
  })
  if (error) return { ok: false, message: error.message ?? 'Could not update feedback.' }
  return { ok: true }
}
