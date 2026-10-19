import { describe, expect, it } from 'vitest'
import { DRAFTS_PAGE_SIZE, nextDraftsCursor } from './draftsCursor.ts'

describe('drafts pagination', () => {
  it('returns 20 rows and a cursor when more exist', () => {
    const rows = Array.from({ length: DRAFTS_PAGE_SIZE + 3 }, (_, index) => ({
      updatedAt: `2026-10-18T12:00:${String(index).padStart(2, '0')}Z`,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }))
    const page = nextDraftsCursor(rows)
    expect(page.page).toHaveLength(DRAFTS_PAGE_SIZE)
    expect(page.nextCursor?.id).toBe(rows[DRAFTS_PAGE_SIZE - 1]?.id)
  })
})
