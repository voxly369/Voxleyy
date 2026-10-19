export type PublishedCursor = {
  publishedAt: string
  id: string
}

export const PUBLISHED_PAGE_SIZE = 20

export function isPublishedCursor(value: unknown): value is PublishedCursor {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.publishedAt === 'string' && typeof row.id === 'string'
}

export function publishedCursorFilter(cursor: PublishedCursor | null): string | null {
  if (!cursor) return null
  const at = cursor.publishedAt.replace(/"/g, '\\"')
  const id = cursor.id.replace(/"/g, '\\"')
  return `published_at.lt."${at}",and(published_at.eq."${at}",id.lt."${id}")`
}

export function nextPublishedCursor<T extends { publishedAt: string; id: string }>(
  rows: T[],
): { page: T[]; nextCursor: PublishedCursor | null } {
  const page = rows.slice(0, PUBLISHED_PAGE_SIZE)
  const hasMore = rows.length > PUBLISHED_PAGE_SIZE
  const last = page[page.length - 1]
  return {
    page,
    nextCursor: hasMore && last ? { publishedAt: last.publishedAt, id: last.id } : null,
  }
}
