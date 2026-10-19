export type FeedCursor = {
  publishedAt: string
  id: string
}

export const FEED_PAGE_SIZE = 10

const ISOish =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/

const UUIDish = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isFeedCursor(value: unknown): value is FeedCursor {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  const publishedAt = row.publishedAt
  const id = row.id
  return typeof publishedAt === 'string' && ISOish.test(publishedAt) && typeof id === 'string' && UUIDish.test(id)
}

export function feedCursorFilter(cursor: FeedCursor | null): string | null {
  if (!cursor) return null
  const at = cursor.publishedAt.replace(/"/g, '\\"')
  const id = cursor.id.replace(/"/g, '\\"')
  return `published_at.lt."${at}",and(published_at.eq."${at}",id.lt."${id}")`
}

export function nextFeedCursor<T extends { publishedAt: string; id: string }>(
  rows: T[],
): { page: T[]; nextCursor: FeedCursor | null } {
  const hasMore = rows.length > FEED_PAGE_SIZE
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows
  if (!hasMore || page.length === 0) return { page, nextCursor: null }
  const last = page[page.length - 1]
  return { page, nextCursor: { publishedAt: last.publishedAt, id: last.id } }
}
