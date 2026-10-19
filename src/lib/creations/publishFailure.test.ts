import { describe, expect, it } from 'vitest'
import { classifyPublishZeroRowUpdate } from './publishFailure.ts'

const viewer = 'user-1'
const row = {
  id: 'work-1',
  authorId: 'user-1',
  updatedAt: '2026-10-19T01:00:00Z',
  isRemoved: false,
}

describe('classifyPublishZeroRowUpdate', () => {
  it('returns not available when the row is missing', () => {
    const result = classifyPublishZeroRowUpdate({
      viewerUserId: viewer,
      row: null,
      expectedUpdatedAt: row.updatedAt,
      account: { status: 'active', suspendedUntil: null },
    })
    expect(result.ok).toBe(false)
    if (result.ok || 'conflict' in result) return
    expect(result.error.message).toBe('This work is not available.')
  })

  it('returns not available when the row belongs to another author', () => {
    const result = classifyPublishZeroRowUpdate({
      viewerUserId: viewer,
      row: { ...row, authorId: 'other' },
      expectedUpdatedAt: row.updatedAt,
      account: { status: 'active', suspendedUntil: null },
    })
    expect(result.ok).toBe(false)
    if (result.ok || 'conflict' in result) return
    expect(result.error.message).toBe('This work is not available.')
  })

  it('returns removed message when is_removed is true', () => {
    const result = classifyPublishZeroRowUpdate({
      viewerUserId: viewer,
      row: { ...row, isRemoved: true },
      expectedUpdatedAt: row.updatedAt,
      account: { status: 'active', suspendedUntil: null },
    })
    expect(result.ok).toBe(false)
    if (result.ok || 'conflict' in result) return
    expect(result.error.message).toBe("This work was removed and can't be changed.")
  })

  it('returns restricted account message for suspended users', () => {
    const result = classifyPublishZeroRowUpdate({
      viewerUserId: viewer,
      row,
      expectedUpdatedAt: row.updatedAt,
      account: { status: 'suspended', suspendedUntil: '2099-01-01T00:00:00Z' },
    })
    expect(result.ok).toBe(false)
    if (result.ok || 'conflict' in result) return
    expect(result.error.message).toBe("Your account can't publish right now.")
  })

  it('returns conflict when updated_at differs', () => {
    const result = classifyPublishZeroRowUpdate({
      viewerUserId: viewer,
      row,
      expectedUpdatedAt: '2026-10-19T00:00:00Z',
      account: { status: 'active', suspendedUntil: null },
    })
    expect(result.ok).toBe(false)
    expect('conflict' in result && result.conflict).toBe(true)
    if (!('conflict' in result)) return
    expect(result.remoteUpdatedAt).toBe(row.updatedAt)
  })
})
