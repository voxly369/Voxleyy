import { describe, expect, it } from 'vitest'
import { groupMessagesByDay } from './grouping.ts'
import type { VisibleMessage } from './types.ts'

function row(id: string, deliverAt: string): VisibleMessage {
  return {
    id,
    conversationId: 'c1',
    senderId: 'u1',
    body: 'hi',
    sharedCreationId: null,
    deliverAt,
    createdAt: deliverAt,
    deletedAt: null,
    isDeleted: false,
    isScheduled: false,
    senderAccountDeleted: false,
  }
}

describe('groupMessagesByDay', () => {
  it('groups messages under Today', () => {
    const now = new Date('2026-06-15T15:00:00.000Z')
    const groups = groupMessagesByDay(
      [row('1', '2026-06-15T10:00:00.000Z'), row('2', '2026-06-15T11:00:00.000Z')],
      now,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBe('Today')
    expect(groups[0]?.messages).toHaveLength(2)
  })
})
