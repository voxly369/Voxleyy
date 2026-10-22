import type { Route } from '@playwright/test'

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

let reportDuplicate = false
let isFounderUser = false
let ownProfileStatus: 'active' | 'suspended' | 'banned' | null = null
let blocks: { blocked_id: string }[] = []
let mutes: { muted_user_id: string }[] = []
let hiddenWords: { word: string }[] = []
let reports: Record<string, unknown>[] = []
let warnings: Record<string, unknown>[] = []
let founderQueue: Record<string, unknown>[] = []

export function resetModerationMocks() {
  reportDuplicate = false
  isFounderUser = false
  ownProfileStatus = null
  blocks = []
  mutes = []
  hiddenWords = []
  reports = []
  warnings = []
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
      target_snapshot: { body_excerpt: 'Sample post body' },
    },
  ]
}

export function setModerationReportDuplicate(value: boolean) {
  reportDuplicate = value
}

export function setModerationIsFounder(value: boolean) {
  isFounderUser = value
}

export function setModerationOwnProfileStatus(status: 'active' | 'suspended' | 'banned' | null) {
  ownProfileStatus = status
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

  if (url.includes('/rest/v1/rpc/dismiss_report') || url.includes('/rest/v1/rpc/remove_content')) {
    return null
  }

  if (url.includes('/rest/v1/rpc/is_founder')) {
    return isFounderUser
  }

  if (url.includes('/rest/v1/founder_report_queue')) {
    return founderQueue
  }

  if (url.includes('/rest/v1/blocks')) {
    if (method === 'POST') {
      const row = postData as { blocked_id?: string }
      if (row.blocked_id) blocks.push({ blocked_id: row.blocked_id })
      return []
    }
    return blocks.map((b) => ({ ...b, created_at: '2026-01-01T00:00:00.000Z', profile: { username: 'writertwo', display_name: 'Writer Two', avatar_url: null } }))
  }

  if (url.includes('/rest/v1/mutes')) {
    if (method === 'POST') {
      const row = postData as { muted_user_id?: string }
      if (row.muted_user_id) mutes.push({ muted_user_id: row.muted_user_id })
      return []
    }
    return mutes.map((m) => ({ ...m, created_at: '2026-01-01T00:00:00.000Z', profile: { username: 'writertwo', display_name: 'Writer Two', avatar_url: null } }))
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
      reports.push({ id: '00000000-0000-0000-0000-000000000088', status: 'open' })
      return [{ id: '00000000-0000-0000-0000-000000000088' }]
    }
    return reports
  }

  if (url.includes('/rest/v1/warnings')) {
    if (method === 'PATCH') return []
    return warnings
  }

  if (url.includes('/rest/v1/appeals')) {
    return []
  }

  if (url.includes('/rest/v1/moderation_actions')) {
    if (isFounderUser && method === 'GET') {
      return [
        {
          id: '00000000-0000-0000-0000-0000000000aa',
          action: 'dismiss',
          target_type: 'creation',
          target_id: '00000000-0000-0000-0000-000000000001',
          target_user_id: null,
          reason: 'Not a policy violation after review.',
          created_at: '2026-01-03T00:00:00.000Z',
        },
      ]
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
