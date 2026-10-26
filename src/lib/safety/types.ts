import type { Database } from '../database.types.ts'

export type ReportReason = Database['public']['Enums']['report_reason']
export type ReportTargetType = Database['public']['Enums']['report_target']

/** UI label "post" maps to database `creation`. */
export type ReportUiTargetType = 'post' | 'comment' | 'profile' | 'message'

export type SafetyApiError = {
  code: 'invalid' | 'forbidden' | 'unavailable' | 'duplicate' | 'rate_limited'
  message: string
  providerCode?: string
  providerStatus?: number
}

export type SafetyResult<T> = { ok: true; data: T } | { ok: false; error: SafetyApiError }

export type BlockRow = {
  blockedId: string
  createdAt: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type MuteRow = {
  mutedUserId: string
  createdAt: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type HiddenWordRow = {
  word: string
  createdAt: string
}

export type OwnReportRow = {
  id: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details: string | null
  status: Database['public']['Enums']['report_status']
  createdAt: string
}

export type AppealRow = {
  id: string
  message: string
  status: string
  decision: Database['public']['Enums']['appeal_decision'] | null
  createdAt: string
  decidedAt: string | null
  moderationActionId: string
}

export type WarningRow = {
  id: string
  message: string
  createdAt: string
  seenAt: string | null
}

export type AccountRestriction = {
  status: Database['public']['Enums']['account_status']
  suspendedUntil: string | null
  statusReason: string | null
}

export type FounderReportQueueRow = {
  report_id: string
  reported_at: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details: string | null
  reporter_username: string | null
  reporter_display_name: string | null
  reported_username: string | null
  reported_display_name: string | null
  reported_user_id: string | null
  reported_user_status: Database['public']['Enums']['account_status'] | null
  prior_reports_against_user: number
  warnings_against_user: number
  moderation_actions_against_user: number
  target_snapshot: Record<string, unknown> | null
}

export type FounderAutoHiddenRow = {
  creation_id: string
  auto_hidden_at: string
  title: string | null
  caption: string | null
  body_excerpt: string | null
  author_id: string
  author_username: string | null
  author_display_name: string | null
  distinct_reporter_count: number
  moderation_action_id: string | null
}

export type FounderContentRow = {
  content_kind: 'creation' | 'comment'
  content_id: string
  author_id: string
  author_username: string | null
  author_display_name: string | null
  title: string | null
  body_excerpt: string | null
  is_removed: boolean
  removed_reason: string | null
  created_at: string
}

export type FounderAuditRow = {
  id: string
  action: Database['public']['Enums']['mod_action']
  target_type: string
  target_id: string | null
  target_user_id: string | null
  reason: string
  created_at: string
}

export type FounderUserSearchHit = {
  id: string
  username: string
  display_name: string
  role: Database['public']['Enums']['user_role']
  status: Database['public']['Enums']['account_status']
  follower_count: number
  created_at: string
  email: string
}
