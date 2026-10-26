import { supabase } from '../supabaseClient.ts'
import { validateFounderReason } from './founderReason.ts'
import { safetyFail } from './safetyFailure.ts'
import type {
  FounderAuditRow,
  FounderAutoHiddenRow,
  FounderContentRow,
  FounderReportQueueRow,
  FounderUserSearchHit,
  SafetyResult,
} from './types.ts'

export const FOUNDER_PAGE_SIZE = 20

export async function dismissReport(reportId: string, reason: string): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('dismiss_report', { p_report_id: reportId, p_reason: validated.reason })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function removeContent(
  targetType: 'creation' | 'comment',
  targetId: string,
  reason: string,
  reportId?: string | null,
): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('remove_content', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: validated.reason,
    p_report_id: reportId ?? undefined,
  })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function restoreContent(
  targetType: 'creation' | 'comment',
  targetId: string,
  reason: string,
  reportId?: string | null,
): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('restore_content', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: validated.reason,
    p_report_id: reportId ?? undefined,
  })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function warnUser(
  userId: string,
  message: string,
  reason: string,
  reportId?: string | null,
): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('warn_user', {
    p_user: userId,
    p_message: message.trim(),
    p_reason: validated.reason,
    p_report_id: reportId ?? undefined,
  })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function suspendUser(
  userId: string,
  days: 1 | 7 | 30,
  reason: string,
  reportId?: string | null,
): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('suspend_user', {
    p_user: userId,
    p_days: days,
    p_reason: validated.reason,
    p_report_id: reportId ?? undefined,
  })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function banUser(userId: string, reason: string, reportId?: string | null): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('ban_user', {
    p_user: userId,
    p_reason: validated.reason,
    p_report_id: reportId ?? undefined,
  })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function unbanUser(userId: string, reason: string, reportId?: string | null): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('unban_user', {
    p_user: userId,
    p_reason: validated.reason,
    p_report_id: reportId ?? undefined,
  })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function decideAppeal(
  appealId: string,
  decision: 'upheld' | 'overturned',
  reason: string,
): Promise<SafetyResult<null>> {
  const validated = validateFounderReason(reason)
  if (!validated.ok) return safetyFail('invalid', validated.message)
  const { error } = await supabase.rpc('decide_appeal', {
    p_appeal_id: appealId,
    p_decision: decision,
    p_reason: validated.reason,
  })
  if (error) return safetyFail('unavailable', error.message ?? 'Action failed.', error)
  return { ok: true, data: null }
}

export async function viewReportedPrivateContent(reportId: string): Promise<SafetyResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('view_reported_private_content', { p_report_id: reportId })
  if (error) return safetyFail('unavailable', error.message ?? 'Could not load private content.', error)
  if (!data || typeof data !== 'object') return safetyFail('unavailable', 'Could not load private content.')
  return { ok: true, data: data as Record<string, unknown> }
}

export async function founderUserSearch(query: string, limit = 25): Promise<SafetyResult<FounderUserSearchHit[]>> {
  const { data, error } = await supabase.rpc('founder_user_search', { p_query: query, p_limit: limit })
  if (error) return safetyFail('unavailable', error.message ?? 'Search failed.', error)
  const list = Array.isArray(data) ? data : []
  const hits: FounderUserSearchHit[] = list.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.username !== 'string') return []
    return [
      {
        id: r.id,
        username: r.username,
        display_name: typeof r.display_name === 'string' ? r.display_name : r.username,
        role: (r.role as FounderUserSearchHit['role']) ?? 'reader',
        status: (r.status as FounderUserSearchHit['status']) ?? 'active',
        follower_count: typeof r.follower_count === 'number' ? r.follower_count : 0,
        created_at: typeof r.created_at === 'string' ? r.created_at : '',
        email: typeof r.email === 'string' ? r.email : '',
      },
    ]
  })
  return { ok: true, data: hits }
}

type Cursor = { reportedAt: string; reportId: string }

function encodeCursor(cursor: Cursor | null): string | undefined {
  if (!cursor) return undefined
  return btoa(JSON.stringify(cursor))
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(atob(raw)) as Cursor
    if (parsed.reportId && parsed.reportedAt) return parsed
  } catch {
    return null
  }
  return null
}

export async function listFounderAutoHiddenQueue(): Promise<SafetyResult<FounderAutoHiddenRow[]>> {
  const { data, error } = await supabase
    .from('founder_auto_hidden_queue')
    .select('*')
    .order('auto_hidden_at', { ascending: false })

  if (error) return safetyFail('unavailable', error.message ?? 'Could not load auto-hidden queue.', error)
  return { ok: true, data: (data ?? []) as FounderAutoHiddenRow[] }
}

export async function listFounderReportQueue(
  cursor: string | null,
): Promise<SafetyResult<{ rows: FounderReportQueueRow[]; nextCursor: string | null }>> {
  const decoded = decodeCursor(cursor)
  let query = supabase
    .from('founder_report_queue')
    .select('*')
    .order('reported_at', { ascending: false })
    .order('report_id', { ascending: false })
    .limit(FOUNDER_PAGE_SIZE + 1)

  if (decoded) {
    query = query.or(
      `reported_at.lt.${decoded.reportedAt},and(reported_at.eq.${decoded.reportedAt},report_id.lt.${decoded.reportId})`,
    )
  }

  const { data, error } = await query
  if (error) return safetyFail('unavailable', error.message ?? 'Could not load reports.', error)

  const all = (data ?? []) as FounderReportQueueRow[]
  const hasMore = all.length > FOUNDER_PAGE_SIZE
  const rows = hasMore ? all.slice(0, FOUNDER_PAGE_SIZE) : all
  const last = rows[rows.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeCursor({ reportedAt: last.reported_at, reportId: last.report_id }) ?? null
      : null

  return { ok: true, data: { rows, nextCursor } }
}

export async function listFounderContent(
  cursor: string | null,
): Promise<SafetyResult<{ rows: FounderContentRow[]; nextCursor: string | null }>> {
  type ContentCursor = { createdAt: string; contentId: string }
  let decoded: ContentCursor | null = null
  if (cursor) {
    try {
      decoded = JSON.parse(atob(cursor)) as ContentCursor
    } catch {
      decoded = null
    }
  }

  let query = supabase
    .from('founder_content_browser')
    .select('*')
    .order('created_at', { ascending: false })
    .order('content_id', { ascending: false })
    .limit(FOUNDER_PAGE_SIZE + 1)

  if (decoded?.createdAt && decoded.contentId) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},content_id.lt.${decoded.contentId})`,
    )
  }

  const { data, error } = await query
  if (error) return safetyFail('unavailable', error.message ?? 'Could not load content.', error)

  const all = (data ?? []) as FounderContentRow[]
  const hasMore = all.length > FOUNDER_PAGE_SIZE
  const rows = hasMore ? all.slice(0, FOUNDER_PAGE_SIZE) : all
  const last = rows[rows.length - 1]
  const nextCursor =
    hasMore && last
      ? btoa(JSON.stringify({ createdAt: last.created_at, contentId: last.content_id }))
      : null

  return { ok: true, data: { rows, nextCursor } }
}

export async function listFounderAppeals(): Promise<SafetyResult<Record<string, unknown>[]>> {
  const { data, error } = await supabase
    .from('appeals')
    .select('id, user_id, message, status, decision, created_at, decided_at, moderation_action_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return safetyFail('unavailable', error.message ?? 'Could not load appeals.', error)
  return { ok: true, data: (data ?? []) as Record<string, unknown>[] }
}

export async function listFounderAuditLog(
  cursor: string | null,
  actionFilter?: string | null,
): Promise<SafetyResult<{ rows: FounderAuditRow[]; nextCursor: string | null }>> {
  type AuditCursor = { createdAt: string; id: string }
  let decoded: AuditCursor | null = null
  if (cursor) {
    try {
      decoded = JSON.parse(atob(cursor)) as AuditCursor
    } catch {
      decoded = null
    }
  }

  let query = supabase
    .from('moderation_actions')
    .select('id, action, target_type, target_id, target_user_id, reason, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(FOUNDER_PAGE_SIZE + 1)

  if (actionFilter) {
    query = query.eq('action', actionFilter as FounderAuditRow['action'])
  }

  if (decoded?.createdAt && decoded.id) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
    )
  }

  const { data, error } = await query
  if (error) return safetyFail('unavailable', error.message ?? 'Could not load audit log.', error)

  const all = (data ?? []) as FounderAuditRow[]
  const hasMore = all.length > FOUNDER_PAGE_SIZE
  const rows = hasMore ? all.slice(0, FOUNDER_PAGE_SIZE) : all
  const last = rows[rows.length - 1]
  const nextCursor = hasMore && last ? btoa(JSON.stringify({ createdAt: last.created_at, id: last.id })) : null
  return { ok: true, data: { rows, nextCursor } }
}
