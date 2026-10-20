import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { feedCursorFilter, isFeedCursor, nextFeedCursor, type FeedCursor } from '../feed/cursor.ts'
import type { FeedPost } from '../feed/types.ts'
import { normalizeTagRouteParam } from './tagLink.ts'
import { DISCOVER_PAGE_SIZE, type DiscoverListResult } from './listDiscover.ts'

const AUTHOR_EMBED = `author:profiles_public!creations_author_id_fkey(id, username, display_name, avatar_url, verified)`

const TAG_FEED_COLUMNS =
  `id, type, title, caption, body_excerpt, body_truncated, cover_url, published_at, like_count, comment_count, save_count, created_at, author_id, ${AUTHOR_EMBED}` as const

export async function tagPublicPostCount(tag: string): Promise<number> {
  const normalized = normalizeTagRouteParam(tag)
  if (!normalized) return 0
  const { data, error } = await supabase.rpc('tag_public_post_count', { p_tag: normalized })
  if (error || data == null) return 0
  return typeof data === 'number' ? data : Number(data)
}

export async function listTagPosts(
  tag: string,
  sort: 'top' | 'recent',
  cursor: FeedCursor | null,
): Promise<DiscoverListResult> {
  const normalized = normalizeTagRouteParam(tag)
  if (!normalized) return { ok: false, error: { code: 'invalid', message: 'That tag is not valid.' } }
  if (cursor && !isFeedCursor(cursor)) {
    return { ok: false, error: { code: 'invalid', message: 'We could not load the next page.' } }
  }

  const { data: tagged, error: tagError } = await supabase
    .from('creation_tags')
    .select('creation_id')
    .eq('tag', normalized)
    .limit(500)

  if (tagError) {
    return {
      ok: false,
      error: { code: 'unavailable', message: 'We could not load this tag.', ...providerFields(tagError) },
    }
  }

  const ids = (tagged ?? []).map((row) => row.creation_id)
  if (ids.length === 0) return { ok: true, data: { posts: [], nextCursor: null } }

  let query = supabase
    .from('feed_creations')
    .select(TAG_FEED_COLUMNS)
    .in('id', ids)
    .order(sort === 'top' ? 'like_count' : 'published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(DISCOVER_PAGE_SIZE + 1)

  const filter = feedCursorFilter(cursor)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) {
    return {
      ok: false,
      error: { code: 'unavailable', message: 'We could not load posts for this tag.', ...providerFields(error) },
    }
  }

  const mapped = (data ?? []).flatMap((row) => {
    const id = typeof row.id === 'string' ? row.id : null
    const publishedAt = typeof row.published_at === 'string' ? row.published_at : null
    const createdAt = typeof row.created_at === 'string' ? row.created_at : null
    const authorRaw = row.author
    if (!id || !publishedAt || !createdAt || !authorRaw || typeof authorRaw !== 'object') return []
    const authorObj = authorRaw as Record<string, unknown>
    const username = typeof authorObj.username === 'string' ? authorObj.username : null
    const authorId = typeof authorObj.id === 'string' ? authorObj.id : null
    if (!username || !authorId) return []
    const post: FeedPost = {
      id,
      type: row.type as FeedPost['type'],
      title: typeof row.title === 'string' ? row.title : null,
      caption: typeof row.caption === 'string' ? row.caption : null,
      bodyExcerpt: typeof row.body_excerpt === 'string' ? row.body_excerpt : null,
      bodyTruncated: row.body_truncated === true,
      status: 'published',
      audience: 'public',
      coverUrl: typeof row.cover_url === 'string' ? row.cover_url : null,
      createdAt,
      publishedAt,
      author: {
        id: authorId,
        username,
        displayName: typeof authorObj.display_name === 'string' ? authorObj.display_name : '',
        avatarUrl: typeof authorObj.avatar_url === 'string' ? authorObj.avatar_url : null,
        verified: authorObj.verified === true,
      },
      likeCount: typeof row.like_count === 'number' ? row.like_count : 0,
      commentCount: typeof row.comment_count === 'number' ? row.comment_count : 0,
      saveCount: typeof row.save_count === 'number' ? row.save_count : 0,
      likedByViewer: false,
      savedByViewer: false,
      tags: [normalized],
    }
    return [{ id, publishedAt, post }]
  })

  const { page, nextCursor } = nextFeedCursor(mapped)
  return { ok: true, data: { posts: page.map((e) => e.post), nextCursor } }
}
