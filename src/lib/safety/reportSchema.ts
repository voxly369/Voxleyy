import { z } from 'zod'
import type { ReportReason, ReportUiTargetType } from './types.ts'

export const REPORT_REASONS = [
  'spam',
  'inappropriate',
  'harassment',
  'copyright',
  'other',
] as const satisfies readonly ReportReason[]

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  spam: 'Spam',
  inappropriate: 'Inappropriate',
  harassment: 'Harassment',
  copyright: 'Copyright',
  other: 'Other',
}

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid target id.')

export const reportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'profile', 'message'] satisfies readonly ReportUiTargetType[]),
  targetId: uuid,
  reportedUserId: uuid.optional(),
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .max(500, 'Details must be at most 500 characters.')
    .optional()
    .transform((value) => {
      if (value === undefined) return null
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }),
})

export type ReportInput = z.infer<typeof reportSchema>

export function mapUiTargetToDb(
  targetType: ReportUiTargetType,
): 'creation' | 'comment' | 'profile' | 'message' {
  if (targetType === 'post') return 'creation'
  return targetType
}

export function parseReportInput(raw: unknown): { ok: true; data: ReportInput } | { ok: false; message: string } {
  const parsed = reportSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, message: first?.message ?? 'Invalid report.' }
  }
  return { ok: true, data: parsed.data }
}
