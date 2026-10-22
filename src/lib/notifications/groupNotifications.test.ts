import { describe, expect, it } from 'vitest'
import { groupNotifications } from './groupNotifications.ts'
import type { NotificationRow } from './types.ts'

function item(createdAt: string): NotificationRow {
  return {
    id: createdAt,
    type: 'like',
    actor: { id: null, username: null, displayName: null, avatarUrl: null },
    targetType: null,
    targetId: null,
    data: {},
    held: false,
    createdAt,
    readAt: null,
    targetTitle: null,
    targetExcerpt: null,
  }
}

describe('groupNotifications', () => {
  it('groups by today, week, and earlier', () => {
    const now = new Date('2026-06-04T12:00:00Z')
    const groups = groupNotifications(
      [
        item('2026-06-04T10:00:00Z'),
        item('2026-06-02T10:00:00Z'),
        item('2026-05-20T10:00:00Z'),
      ],
      now,
    )
    expect(groups.map((g) => g.key)).toEqual(['today', 'this_week', 'earlier'])
  })
})
