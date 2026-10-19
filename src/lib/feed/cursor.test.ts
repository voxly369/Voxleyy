import { describe, expect, it } from 'vitest'
import { feedCursorFilter, isFeedCursor } from './cursor.ts'

describe('feed cursor', () => {
  it('rejects malformed cursors', () => {
    expect(isFeedCursor(null)).toBe(false)
    expect(isFeedCursor({ publishedAt: 'not-a-date', id: '123' })).toBe(false)
  })

  it('builds a keyset filter', () => {
    const cursor = { publishedAt: '2026-10-18T22:37:04.123456+00:00', id: '11111111-1111-4111-8111-111111111111' }
    expect(isFeedCursor(cursor)).toBe(true)
    expect(feedCursorFilter(cursor)).toContain('published_at.lt')
  })
})
