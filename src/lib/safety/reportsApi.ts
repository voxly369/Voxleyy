import { supabase } from '../supabaseClient.ts'
import { mapUiTargetToDb, parseReportInput, type ReportInput } from './reportSchema.ts'
import { mapReportInsertError, safetyFail } from './safetyFailure.ts'
import type { OwnReportRow, SafetyResult } from './types.ts'

export async function submitReport(raw: unknown): Promise<SafetyResult<{ id: string }>> {
  const parsed = parseReportInput(raw)
  if (!parsed.ok) return safetyFail('invalid', parsed.message)

  const input: ReportInput = parsed.data
  const { data: session } = await supabase.auth.getSession()
  const reporterId = session.session?.user.id
  if (!reporterId) return safetyFail('forbidden', 'Sign in to report.')

  const row = {
    target_type: mapUiTargetToDb(input.targetType),
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? null,
    reporter_id: reporterId,
    ...(input.reportedUserId ? { reported_user_id: input.reportedUserId } : {}),
  }

  const { data, error } = await supabase.from('reports').insert(row).select('id').maybeSingle()
  if (error) {
    const msg = error.message ?? 'We could not submit your report. Try again.'
    return safetyFail(mapReportInsertError(msg), msg, error)
  }
  return { ok: true, data: { id: data?.id ?? 'submitted' } }
}

export async function listMyReports(): Promise<SafetyResult<OwnReportRow[]>> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, details, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return safetyFail('unavailable', 'We could not load your reports. Try again.', error)

  const rows: OwnReportRow[] = (data ?? []).flatMap((row) => {
    if (!row.id || !row.target_id || !row.target_type || !row.reason || !row.status || !row.created_at) return []
    return [
      {
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        details: row.details ?? null,
        status: row.status,
        createdAt: row.created_at,
      },
    ]
  })
  return { ok: true, data: rows }
}
