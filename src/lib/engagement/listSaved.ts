import { mapLibraryItemRow } from '../library/mapLibraryRow.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import type { FeedPost } from '../feed/types.ts'

const SAVED_PAGE_SIZE = 10

export type SavedCursor = { savedAt: string; creationId: string }

export type SavedFailure = {
  ok: false
  error: {
    code: 'forbidden' | 'unavailable' | 'invalid'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type SavedPage = {
  posts: FeedPost[]
  unavailableIds: string[]
  nextCursor: SavedCursor | null
}

export type SavedResult = { ok: true; data: SavedPage } | SavedFailure

function toFeedPost(item: NonNullable<ReturnType<typeof mapLibraryItemRow>>): FeedPost | null {
  if (!item || !item.isAvailable || !item.type || !item.publishedAt || !item.author) return null
  return {
    id: item.creationId,
    type: item.type,
    title: item.title,
    caption: item.caption,
    bodyExcerpt: item.bodyExcerpt,
    bodyTruncated: item.bodyTruncated,
    status: 'published',
    audience: 'public',
    coverUrl: item.coverUrl,
    createdAt: item.publishedAt,
    publishedAt: item.publishedAt,
    author: {
      id: item.author.id,
      username: item.author.username,
      displayName: item.author.displayName,
      avatarUrl: item.author.avatarUrl,
      verified: item.author.verified,
    },
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    likedByViewer: false,
    savedByViewer: true,
    tags: [],
  }
}

export async function listSaved(cursor: SavedCursor | null): Promise<SavedResult> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return { ok: false, error: { code: 'forbidden', message: 'Sign in to see saved works.' } }

  let query = supabase
    .from('library_saved_items')
    .select('*')
    .order('saved_at', { ascending: false })
    .order('creation_id', { ascending: false })
    .limit(SAVED_PAGE_SIZE + 1)

  if (cursor) {
    query = query.or(
      `saved_at.lt."${cursor.savedAt}",and(saved_at.eq."${cursor.savedAt}",creation_id.lt."${cursor.creationId}")`,
    )
  }

  const { data, error } = await query
  if (error) {
    return { ok: false, error: { code: 'unavailable', message: 'We could not load saved works. Try again.', ...providerFields(error) } }
  }

  const rows = data ?? []
  const hasMore = rows.length > SAVED_PAGE_SIZE
  const page = hasMore ? rows.slice(0, SAVED_PAGE_SIZE) : rows
  const posts: FeedPost[] = []
  const unavailableIds: string[] = []

  for (const row of page) {
    const item = mapLibraryItemRow(row as Record<string, unknown>)
    if (!item) continue
    if (!item.isAvailable) {
      unavailableIds.push(item.creationId)
      continue
    }
    const post = toFeedPost(item)
    if (post) posts.push(post)
  }

  const last = page[page.length - 1] as Record<string, unknown> | undefined
  const nextCursor =
    hasMore && last ? { savedAt: String(last.saved_at), creationId: String(last.creation_id) } : null

  return { ok: true, data: { posts, unavailableIds, nextCursor } }
}
