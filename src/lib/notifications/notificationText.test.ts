import { describe, expect, it } from 'vitest'
import { buildAdminDisplayText, buildDisplayText } from './notificationText.ts'
import type { AdminNotificationRow, NotificationRow } from './types.ts'

function row(partial: Partial<NotificationRow> & Pick<NotificationRow, 'type'>): NotificationRow {
  return {
    id: '1',
    actor: { id: 'a', username: 'writer', displayName: 'Writer', avatarUrl: null },
    targetType: 'creation',
    targetId: 'c1',
    data: {},
    held: false,
    createdAt: '2026-01-01T00:00:00Z',
    readAt: null,
    targetTitle: 'My poem',
    targetExcerpt: null,
    ...partial,
  }
}

describe('buildDisplayText', () => {
  it('covers engagement types', () => {
    expect(buildDisplayText(row({ type: 'follow' }))).toContain('followed you')
    expect(buildDisplayText(row({ type: 'like' }))).toContain('liked')
    expect(buildDisplayText(row({ type: 'mention' }))).toContain('mentioned you')
  })

  it('formats moderation and summary', () => {
    expect(buildDisplayText(row({ type: 'moderation_notice', data: { kind: 'banned' } }))).toContain('banned')
    expect(buildDisplayText(row({ type: 'summary', data: { count: 3 } }))).toContain('3 notifications')
  })
})

describe('buildAdminDisplayText', () => {
  it('formats founder alerts', () => {
    const admin: AdminNotificationRow = {
      id: 'a1',
      type: 'new_report',
      actor: { id: 'r', username: 'reader', displayName: 'Reader', avatarUrl: null },
      targetType: 'creation',
      targetId: 'c1',
      data: {},
      createdAt: '2026-01-01T00:00:00Z',
      readAt: null,
    }
    expect(buildAdminDisplayText(admin)).toContain('report')
  })
})
