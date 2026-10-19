import type { CreationAuthor } from '../creations/types.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import type { FeedPost } from '../feed/types.ts'

const AUTHOR_EMBED = `author:profiles_public!creations_author_id_fkey(id, username, display_name, avatar_url, verified)`

const FEED_POST_COLUMNS =
  `id, type, title, caption, body_text, cover_url, audience, published_at, like_count, comment_count, save_count, created_at, author_id, ${AUTHOR_EMBED}` as const

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
  nextCursor: SavedCursor | null
}

export type SavedResult = { ok: true; data: SavedPage } | SavedFailure

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function parseAuthor(value: unknown): CreationAuthor | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = text(row.id)
  const username = text(row.username)
  if (!id || !username) return null
  return {
    id,
    username,
    displayName: text(row.display_name) ?? '',
    avatarUrl: text(row.avatar_url),
    verified: row.verified === true,
  }
}

export async function listSaved(cursor: SavedCursor | null): Promise<SavedResult> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return { ok: false, error: { code: 'forbidden', message: 'Sign in to see saved works.' } }

  let query = supabase
    .from('saves')
    .select('created_at, creation_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('creation_id', { ascending: false })
    .limit(SAVED_PAGE_SIZE + 1)

  if (cursor) {
    query = query.or(
      `created_at.lt."${cursor.savedAt}",and(created_at.eq."${cursor.savedAt}",creation_id.lt."${cursor.creationId}")`,
    )
  }

  const { data: saves, error } = await query
  if (error) {
    return { ok: false, error: { code: 'unavailable', message: 'We could not load saved works. Try again.', ...providerFields(error) } }
  }

  const saveRows = saves ?? []
  const hasMore = saveRows.length > SAVED_PAGE_SIZE
  const pageSaves = hasMore ? saveRows.slice(0, SAVED_PAGE_SIZE) : saveRows
  const ids = pageSaves.map((row) => row.creation_id)

  if (ids.length === 0) {
    return { ok: true, data: { posts: [], nextCursor: null } }
  }

  const { data: visible, error: feedError } = await supabase.from('feed_creations').select(FEED_POST_COLUMNS).in('id', ids)
  if (feedError) {
    return { ok: false, error: { code: 'unavailable', message: 'We could not load saved works. Try again.', ...providerFields(feedError) } }
  }

  const byId = new Map((visible ?? []).map((row) => [row.id as string, row as Record<string, unknown>]))
  const posts: FeedPost[] = []

  for (const save of pageSaves) {
    const creation = byId.get(save.creation_id)
    if (!creation) continue
    const id = text(creation.id)
    const publishedAt = text(creation.published_at)
    const type = creation.type
    const audience = creation.audience
    const createdAt = text(creation.created_at)
    const author = parseAuthor(creation.author)
    if (!id || !publishedAt || !createdAt || !author || typeof type !== 'string' || typeof audience !== 'string') continue
    posts.push({
      id,
      type: type as FeedPost['type'],
      title: text(creation.title),
      caption: text(creation.caption),
      bodyText: text(creation.body_text),
      status: 'published',
      audience: audience as FeedPost['audience'],
      coverUrl: text(creation.cover_url),
      createdAt,
      publishedAt,
      author,
      likeCount: typeof creation.like_count === 'number' ? creation.like_count : 0,
      commentCount: typeof creation.comment_count === 'number' ? creation.comment_count : 0,
      saveCount: typeof creation.save_count === 'number' ? creation.save_count : 0,
      likedByViewer: false,
      savedByViewer: true,
      tags: [],
    })
  }

  const nextCursor =
    hasMore && pageSaves.length > 0
      ? { savedAt: pageSaves[pageSaves.length - 1].created_at, creationId: pageSaves[pageSaves.length - 1].creation_id }
      : null

  return { ok: true, data: { posts, nextCursor } }
}
