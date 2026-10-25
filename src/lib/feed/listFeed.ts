import { feedBadgesByUserIds } from '../badges/api.ts'
import { displayBadgesForFeed } from '../badges/displayBadgesForFeed.ts'
import type { CreationAuthor } from '../creations/types.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { FEED_PAGE_SIZE, feedCursorFilter, isFeedCursor, nextFeedCursor } from './cursor.ts'
import type { FeedKind, FeedPage, FeedPost } from './types.ts'

const AUTHOR_EMBED = `author:profiles_public!creations_author_id_fkey(id, username, display_name, avatar_url, verified)`

const FEED_COLUMNS =
  `id, type, title, caption, body_excerpt, body_truncated, cover_url, language, audience, published_at, like_count, comment_count, save_count, created_at, author_id, ${AUTHOR_EMBED}` as const

export type FeedFailure = {
  ok: false
  error: {
    code: 'invalid' | 'forbidden' | 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type FeedResult = { ok: true; data: FeedPage } | FeedFailure

function fail(code: FeedFailure['error']['code'], message: string, error?: { code?: string; status?: number }): FeedFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

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

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function bool(value: unknown): boolean {
  return value === true
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

async function viewerLikeSaveSets(viewerId: string, creationIds: string[]): Promise<FeedResult | { liked: Set<string>; saved: Set<string> }> {
  if (creationIds.length === 0) return { liked: new Set(), saved: new Set() }

  const [likes, saves] = await Promise.all([
    supabase.from('likes').select('creation_id').eq('user_id', viewerId).in('creation_id', creationIds),
    supabase.from('saves').select('creation_id').eq('user_id', viewerId).in('creation_id', creationIds),
  ])

  if (likes.error) return fail('unavailable', 'We could not load your likes. Try again.', likes.error)
  if (saves.error) return fail('unavailable', 'We could not load your saves. Try again.', saves.error)

  return {
    liked: new Set((likes.data ?? []).map((row) => row.creation_id)),
    saved: new Set((saves.data ?? []).map((row) => row.creation_id)),
  }
}

async function tagsForCreations(creationIds: string[]): Promise<FeedResult | Map<string, string[]>> {
  if (creationIds.length === 0) return new Map()
  const { data, error } = await supabase.from('creation_tags').select('creation_id, tag').in('creation_id', creationIds)
  if (error) return fail('unavailable', 'We could not load tags. Try again.', error)
  const map = new Map<string, string[]>()
  for (const row of data ?? []) {
    const list = map.get(row.creation_id) ?? []
    list.push(row.tag)
    map.set(row.creation_id, list)
  }
  return map
}

export async function listFeed(kind: FeedKind, cursor: import('./cursor.ts').FeedCursor | null): Promise<FeedResult> {
  if (cursor && !isFeedCursor(cursor)) return fail('invalid', 'We could not load the next page.')

  const viewerId = await currentUserId()
  if (!viewerId) return fail('forbidden', 'Sign in to see your feed.')

  const table = kind === 'following' ? 'following_feed' : 'feed_creations'

  let query = supabase
    .from(table)
    .select(FEED_COLUMNS)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(FEED_PAGE_SIZE + 1)

  const filter = feedCursorFilter(cursor)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) return fail('unavailable', 'We could not load the feed. Try again.', error)

  const mapped = (data ?? []).flatMap((row) => {
    const id = text(row.id)
    const publishedAt = text(row.published_at)
    const type = row.type
    const audience = row.audience
    const createdAt = text(row.created_at)
    const author = parseAuthor(row.author)
    if (!id || !publishedAt || !createdAt || !author) return []
    if (typeof type !== 'string' || typeof audience !== 'string') return []

    return [
      {
        publishedAt,
        id,
        post: {
          id,
          type: type as FeedPost['type'],
          title: text(row.title),
          caption: text(row.caption),
          bodyExcerpt: text(row.body_excerpt),
          bodyTruncated: bool(row.body_truncated),
          status: 'published' as const,
          audience: audience as FeedPost['audience'],
          coverUrl: text(row.cover_url),
          createdAt,
          publishedAt,
          author,
          likeCount: count(row.like_count),
          commentCount: count(row.comment_count),
          saveCount: count(row.save_count),
          likedByViewer: false,
          savedByViewer: false,
          tags: [] as string[],
          language: text(row.language) ?? 'en',
        },
      },
    ]
  })

  const { page, nextCursor } = nextFeedCursor(mapped)
  const creationIds = page.map((entry) => entry.id)

  const engagement = await viewerLikeSaveSets(viewerId, creationIds)
  if ('ok' in engagement && engagement.ok === false) return engagement

  const tagMap = await tagsForCreations(creationIds)
  if ('ok' in tagMap && tagMap.ok === false) return tagMap

  const authorIds = [...new Set(page.map((entry) => entry.post.author.id))]
  const badgeMapResult = await feedBadgesByUserIds(authorIds)
  if (!badgeMapResult.ok) return fail('unavailable', badgeMapResult.error.message, badgeMapResult.error)
  const badgeMap = badgeMapResult.data

  const { liked, saved } = engagement as { liked: Set<string>; saved: Set<string> }
  const tags = tagMap as Map<string, string[]>

  return {
    ok: true,
    data: {
      posts: page.map((entry) => ({
        ...entry.post,
        author: {
          ...entry.post.author,
          feedBadges: displayBadgesForFeed(badgeMap.get(entry.post.author.id) ?? []),
        },
        likedByViewer: liked.has(entry.id),
        savedByViewer: saved.has(entry.id),
        tags: tags.get(entry.id) ?? [],
      })),
      nextCursor,
    },
  }
}
