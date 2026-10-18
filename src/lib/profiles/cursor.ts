// follows has no single id column. Page ties break on the other profile id:
// follower_id for a followers list, followee_id for a following list.
export const FOLLOW_PAGE_SIZE = 20

export type FollowCursor = {
  createdAt: string
  id: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isFollowCursor(value: FollowCursor): boolean {
  return UUID_PATTERN.test(value.id) && value.createdAt.length > 0 && !/["\\,()]/.test(value.createdAt)
}

export function followCursorFilter(
  cursor: FollowCursor | null,
  idColumn: 'follower_id' | 'followee_id',
): string | null {
  if (!cursor) return null
  if (!isFollowCursor(cursor)) return null
  const created = `"${cursor.createdAt}"`
  const id = `"${cursor.id}"`
  return `created_at.lt.${created},and(created_at.eq.${created},${idColumn}.lt.${id})`
}

export function nextFollowCursor<T extends FollowCursor>(
  rows: readonly T[],
  pageSize = FOLLOW_PAGE_SIZE,
): { page: T[]; nextCursor: FollowCursor | null } {
  const hasMore = rows.length > pageSize
  const page = rows.slice(0, hasMore ? pageSize : rows.length)
  const last = page.at(-1)
  return {
    page: [...page],
    nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
  }
}
