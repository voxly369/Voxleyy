/**
 * Playwright-only Supabase REST mocks for moderation flows.
 * Never import this module from src/ — production builds must not include these hooks.
 */
import type { Route } from '@playwright/test'

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

let reportDuplicate = false
let isFounderUser = false
let includeBannedUserInSearch = false
let ownProfileStatus: 'active' | 'suspended' | 'banned' | null = null
let blocks: { blocked_id: string }[] = []
let mutes: { muted_user_id: string }[] = []
let hiddenWords: { word: string }[] = []
let reports: Record<string, unknown>[] = []
let warnings: Record<string, unknown>[] = []
let appeals: Record<string, unknown>[] = []
let founderQueue: Record<string, unknown>[] = []
let auditLog: Record<string, unknown>[] = []
let founderContent: Record<string, unknown>[] = []
let privateReportId: string | null = null
let allowPrivateView = true

const AUDIT_ID = () => `00000000-0000-0000-0000-${String(auditLog.length + 1).padStart(12, '0')}`

function pushAudit(action: string, reason: string, extra: Record<string, unknown> = {}) {
  auditLog.unshift({
    id: AUDIT_ID(),
    action,
    target_type: 'creation',
    target_id: '00000000-0000-0000-0000-000000000001',
    target_user_id: '22222222-2222-2222-2222-222222222222',
    reason,
    created_at: new Date().toISOString(),
    ...extra,
  })
}

export function resetModerationMocks() {
  reportDuplicate = false
  isFounderUser = false
  includeBannedUserInSearch = false
  ownProfileStatus = null
  blocks = []
  mutes = []
  hiddenWords = []
  reports = [
    {
      id: '00000000-0000-0000-0000-0000000000r1',
      target_type: 'creation',
      target_id: '00000000-0000-0000-0000-000000000001',
      reason: 'spam',
      details: 'Sent report',
      status: 'open',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: '00000000-0000-0000-0000-0000000000r2',
      target_type: 'comment',
      target_id: 'c0000000-0000-0000-0000-000000000001',
      reason: 'inappropriate',
      details: null,
      status: 'dismissed',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]
  warnings = []
  appeals = [
    {
      id: '00000000-0000-0000-0000-0000000000a1',
      message: 'I disagree with the removal.',
      status: 'pending',
      created_at: '2026-01-02T00:00:00.000Z',
      moderation_action_id: '00000000-0000-0000-0000-0000000000aa',
    },
    {
      id: '00000000-0000-0000-0000-0000000000a2',
      message: 'Second pending appeal',
      status: 'pending',
      created_at: '2026-01-01T00:00:00.000Z',
      moderation_action_id: '00000000-0000-0000-0000-0000000000ab',
    },
    {
      id: '00000000-0000-0000-0000-0000000000a3',
      message: 'Older decided appeal',
      status: 'decided',
      decision: 'overturned',
      created_at: '2025-12-01T00:00:00.000Z',
      moderation_action_id: '00000000-0000-0000-0000-0000000000ac',
    },
  ]
  auditLog = []
  founderContent = [
    {
      content_kind: 'creation',
      content_id: '00000000-0000-0000-0000-000000000001',
      author_username: 'writertwo',
      title: 'Sample post',
      body_excerpt: 'Sample post body',
      is_removed: false,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      content_kind: 'comment',
      content_id: 'c0000000-0000-0000-0000-000000000001',
      author_username: 'writertwo',
      body_excerpt: 'Top comment',
      is_removed: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]
  privateReportId = '00000000-0000-0000-0000-000000000088'
  allowPrivateView = true
  founderQueue = [
    {
      report_id: '00000000-0000-0000-0000-000000000099',
      reported_at: '2026-01-02T00:00:00.000Z',
      target_type: 'creation',
      target_id: '00000000-0000-0000-0000-000000000001',
      reason: 'spam',
      details: 'E2E report',
      status: 'open',
      reporter_id: '11111111-1111-1111-1111-111111111111',
      reporter_username: 'readerone',
      reporter_display_name: 'Reader One',
      reported_user_id: '22222222-2222-2222-2222-222222222222',
      reported_username: 'writertwo',
      reported_display_name: 'Writer Two',
      reported_user_status: 'active',
      prior_reports_against_user: 0,
      warnings_against_user: 0,
      moderation_actions_against_user: 0,
      target_snapshot: { body_excerpt: 'Sample post body', audience: 'public' },
    },
    {
      report_id: '00000000-0000-0000-0000-000000000088',
      reported_at: '2026-01-03T00:00:00.000Z',
      target_type: 'creation',
      target_id: '00000000-0000-0000-0000-0000000000p1',
      reason: 'other',
      details: 'Private journal report',
      status: 'open',
      reporter_id: '11111111-1111-1111-1111-111111111111',
      reporter_username: 'readerone',
      reported_user_id: '22222222-2222-2222-2222-222222222222',
      reported_username: 'writertwo',
      target_snapshot: { audience: 'private', body_text: 'Secret journal entry' },
    },
  ]
}

export function setModerationReportDuplicate(value: boolean) {
  reportDuplicate = value
}

export function setModerationIsFounder(value: boolean) {
  isFounderUser = value
}

export function setModerationIncludeBannedUserInSearch(value: boolean) {
  includeBannedUserInSearch = value
}

export function setModerationOwnProfileStatus(status: 'active' | 'suspended' | 'banned' | null) {
  ownProfileStatus = status
}

export function setModerationAllowPrivateView(value: boolean) {
  allowPrivateView = value
}

export function setModerationUnseenWarnings(messages: { id: string; message: string }[]) {
  warnings = messages.map((w) => ({ ...w, seen_at: null, created_at: '2026-01-02T00:00:00.000Z' }))
}

export function setModerationReportsEmpty() {
  reports = []
}

export function prependFounderQueueRow(row: Record<string, unknown>) {
  founderQueue = [row, ...founderQueue]
}

/** Seed audit rows for Founder pagination e2e (newest first by created_at). */
export function seedModerationAuditLog(count: number) {
  auditLog = Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
    action: 'dismiss',
    target_type: 'creation',
    target_id: '00000000-0000-0000-0000-000000000001',
    target_user_id: '22222222-2222-2222-2222-222222222222',
    reason: `Audit row ${index + 1}`,
    created_at: new Date(Date.UTC(2026, 0, 1, 12, 0, count - index)).toISOString(),
  }))
}

export function moderationOwnProfileStatus(): typeof ownProfileStatus {
  return ownProfileStatus
}

export function moderationMutedUserIds(): string[] {
  return mutes.map((m) => m.muted_user_id)
}

export function moderationBlockedUserIds(): string[] {
  return blocks.map((b) => b.blocked_id)
}

export function moderationAuditLog(): Record<string, unknown>[] {
  return auditLog
}

function rpcBody(postData: unknown): Record<string, unknown> {
  if (!postData || typeof postData !== 'object') return {}
  return postData as Record<string, unknown>
}

export function moderationMockHandleRest(url: string, method: string, postData: unknown): Json | undefined {
  if (url.includes('/rest/v1/rpc/my_account_restriction')) {
    if (ownProfileStatus === 'banned') {
      return [{ status: 'banned', status_reason: 'Repeated harassment', suspended_until: null }]
    }
    if (ownProfileStatus === 'suspended') {
      return [{ status: 'suspended', status_reason: 'Policy violation', suspended_until: '2030-01-01T00:00:00.000Z' }]
    }
    return [{ status: 'active', status_reason: null, suspended_until: null }]
  }

  if (url.includes('/rest/v1/rpc/is_founder')) {
    return isFounderUser
  }

  if (url.includes('/rest/v1/rpc/dismiss_report')) {
    pushAudit('dismiss', String(rpcBody(postData).p_reason ?? ''))
    return null
  }
  if (url.includes('/rest/v1/rpc/remove_content')) {
    pushAudit('remove', String(rpcBody(postData).p_reason ?? ''))
    const targetId = String(rpcBody(postData).p_target_id ?? '')
    founderContent = founderContent.map((row) =>
      row.content_id === targetId ? { ...row, is_removed: true } : row,
    )
    return null
  }
  if (url.includes('/rest/v1/rpc/restore_content')) {
    pushAudit('restore', String(rpcBody(postData).p_reason ?? ''))
    const targetId = String(rpcBody(postData).p_target_id ?? '')
    founderContent = founderContent.map((row) =>
      row.content_id === targetId ? { ...row, is_removed: false } : row,
    )
    return null
  }
  if (url.includes('/rest/v1/rpc/warn_user')) {
    pushAudit('warn', String(rpcBody(postData).p_reason ?? ''))
    return null
  }
  if (url.includes('/rest/v1/rpc/suspend_user')) {
    pushAudit('suspend', String(rpcBody(postData).p_reason ?? ''))
    return null
  }
  if (url.includes('/rest/v1/rpc/ban_user')) {
    pushAudit('ban', String(rpcBody(postData).p_reason ?? ''))
    return null
  }
  if (url.includes('/rest/v1/rpc/unban_user')) {
    pushAudit('unban', String(rpcBody(postData).p_reason ?? ''))
    return null
  }
  if (url.includes('/rest/v1/rpc/decide_appeal')) {
    const body = rpcBody(postData)
    const appealId = String(body.p_appeal_id ?? '')
    const decision = String(body.p_decision ?? '')
    appeals = appeals.map((row) =>
      row.id === appealId ? { ...row, status: 'decided', decision, decided_at: new Date().toISOString() } : row,
    )
    pushAudit('appeal_decision', String(body.p_reason ?? ''), {
      target_type: 'appeal',
      target_id: appealId,
    })
    return null
  }
  if (url.includes('/rest/v1/rpc/view_reported_private_content')) {
    const reportId = String(rpcBody(postData).p_report_id ?? '')
    if (!allowPrivateView || reportId !== privateReportId) {
      return { __httpError: { status: 400, message: 'No open report for this content' } } as unknown as Json
    }
    pushAudit('private_content_view', 'Founder viewed reported private content', {
      target_type: 'report',
      target_id: reportId,
    })
    return { body_text: 'Secret journal entry' }
  }
  if (url.includes('/rest/v1/rpc/founder_user_search')) {
    const hits = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        username: 'writertwo',
        display_name: 'Writer Two',
        role: 'writer',
        status: 'active',
        follower_count: 12,
        created_at: '2026-01-01T00:00:00.000Z',
        email: 'writer@example.com',
      },
    ]
    if (includeBannedUserInSearch) {
      hits.push({
        id: '44444444-4444-4444-4444-444444444444',
        username: 'banneduser',
        display_name: 'Banned User',
        role: 'writer',
        status: 'banned',
        follower_count: 0,
        created_at: '2025-12-01T00:00:00.000Z',
        email: 'banned@example.com',
      })
    }
    return hits
  }

  if (url.includes('/rest/v1/founder_report_queue')) {
    return founderQueue
  }

  if (url.includes('/rest/v1/founder_content_browser')) {
    return founderContent
  }

  if (url.includes('/rest/v1/blocks')) {
    if (method === 'POST') {
      const row = postData as { blocked_id?: string }
      if (row.blocked_id) blocks.push({ blocked_id: row.blocked_id })
      return []
    }
    return blocks.map((b) => ({
      ...b,
      created_at: '2026-01-01T00:00:00.000Z',
      profile: { username: 'writertwo', display_name: 'Writer Two', avatar_url: null },
    }))
  }

  if (url.includes('/rest/v1/mutes')) {
    if (method === 'POST') {
      const row = postData as { muted_user_id?: string }
      if (row.muted_user_id) mutes.push({ muted_user_id: row.muted_user_id })
      return []
    }
    return mutes.map((m) => ({
      ...m,
      created_at: '2026-01-01T00:00:00.000Z',
      profile: { username: 'writertwo', display_name: 'Writer Two', avatar_url: null },
    }))
  }

  if (url.includes('/rest/v1/hidden_words')) {
    if (method === 'POST') {
      const row = postData as { word?: string }
      if (row.word) hiddenWords.push({ word: row.word })
      return []
    }
    return hiddenWords.map((w) => ({ ...w, created_at: '2026-01-01T00:00:00.000Z' }))
  }

  if (url.includes('/rest/v1/reports')) {
    if (method === 'POST') {
      if (reportDuplicate) {
        return { __httpError: { status: 400, message: 'You already reported this' } } as unknown as Json
      }
      reports.unshift({
        id: '00000000-0000-0000-0000-000000000088',
        target_type: 'creation',
        target_id: '00000000-0000-0000-0000-000000000001',
        reason: 'spam',
        status: 'open',
        created_at: new Date().toISOString(),
      })
      return [{ id: '00000000-0000-0000-0000-000000000088' }]
    }
    return reports
  }

  if (url.includes('/rest/v1/warnings')) {
    if (method === 'PATCH') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      const id = idMatch?.[1]
      const patch = postData as { seen_at?: string }
      warnings = warnings.map((w) => (w.id === id ? { ...w, seen_at: patch.seen_at ?? new Date().toISOString() } : w))
      return []
    }
    if (url.includes('seen_at=is.null') || url.includes('seen_at=is.null')) {
      return warnings.filter((w) => w.seen_at == null)
    }
    return warnings
  }

  if (url.includes('/rest/v1/appeals')) {
    if (method === 'POST') return [{ id: '00000000-0000-0000-0000-0000000000a3' }]
    if (url.includes('status=eq.pending')) return appeals.filter((a) => a.status === 'pending')
    return appeals
  }

  if (url.includes('/rest/v1/moderation_actions')) {
    if (isFounderUser && method === 'GET') {
      let rows = auditLog.length > 0 ? [...auditLog] : []
      const actionMatch = url.match(/action=eq\.([^&]+)/)
      if (actionMatch?.[1]) rows = rows.filter((r) => r.action === actionMatch[1])
      rows.sort((a, b) => {
        const ta = String(a.created_at)
        const tb = String(b.created_at)
        if (ta !== tb) return tb.localeCompare(ta)
        return String(b.id).localeCompare(String(a.id))
      })
      const ltMatch = url.match(/created_at\.lt\.([^,)&]+)/)
      if (ltMatch?.[1]) {
        const lt = decodeURIComponent(ltMatch[1])
        const eqMatch = url.match(/created_at\.eq\.([^,)&]+)/)
        const idLtMatch = url.match(/id\.lt\.([^)&]+)/)
        rows = rows.filter((row) => {
          const created = String(row.created_at)
          if (created < lt) return true
          if (eqMatch?.[1] && idLtMatch?.[1] && created === decodeURIComponent(eqMatch[1])) {
            return String(row.id) < decodeURIComponent(idLtMatch[1])
          }
          return false
        })
      }
      const limitMatch = url.match(/limit=(\d+)/)
      const limit = limitMatch ? Number.parseInt(limitMatch[1], 10) : rows.length
      return rows.slice(0, limit)
    }
    return []
  }

  return undefined
}

export async function fulfillModerationRoute(route: Route, body: Json) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}
