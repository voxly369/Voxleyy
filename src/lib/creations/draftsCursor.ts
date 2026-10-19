export type DraftsCursor = {
  updatedAt: string
  id: string
}

export const DRAFTS_PAGE_SIZE = 20

export function isDraftsCursor(value: unknown): value is DraftsCursor {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.updatedAt === 'string' && typeof row.id === 'string'
}

export function draftsCursorFilter(cursor: DraftsCursor | null): string | null {
  if (!cursor) return null
  const at = cursor.updatedAt.replace(/"/g, '\\"')
  const id = cursor.id.replace(/"/g, '\\"')
  return `updated_at.lt."${at}",and(updated_at.eq."${at}",id.lt."${id}")`
}

export function nextDraftsCursor<T extends { updatedAt: string; id: string }>(
  rows: T[],
): { page: T[]; nextCursor: DraftsCursor | null } {
  const page = rows.slice(0, DRAFTS_PAGE_SIZE)
  const hasMore = rows.length > DRAFTS_PAGE_SIZE
  const last = page[page.length - 1]
  return {
    page,
    nextCursor: hasMore && last ? { updatedAt: last.updatedAt, id: last.id } : null,
  }
}
