import { describe, expect, it } from 'vitest'
import {
  isPublishedCursor,
  nextPublishedCursor,
  publishedCursorFilter,
  PUBLISHED_PAGE_SIZE,
} from './publishedCursor.ts'

describe('published cursor', () => {
  it('validates cursor shape', () => {
    expect(isPublishedCursor({ publishedAt: '2026-01-01', id: 'abc' })).toBe(true)
    expect(isPublishedCursor({ publishedAt: '2026-01-01' })).toBe(false)
  })

  it('builds filter and next cursor', () => {
    expect(publishedCursorFilter({ publishedAt: '2026-01-01T00:00:00Z', id: 'id-1' })).toContain('published_at.lt')
    const rows = Array.from({ length: PUBLISHED_PAGE_SIZE + 1 }, (_, i) => ({
      publishedAt: `2026-01-${String(i + 1).padStart(2, '0')}`,
      id: `id-${i}`,
    }))
    const { page, nextCursor } = nextPublishedCursor(rows)
    expect(page).toHaveLength(PUBLISHED_PAGE_SIZE)
    expect(nextCursor).toEqual({ publishedAt: rows[PUBLISHED_PAGE_SIZE - 1].publishedAt, id: rows[PUBLISHED_PAGE_SIZE - 1].id })
  })
})
