import type { Database } from '../database.types.ts'
import type { CreationAuthor } from '../creations/types.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { feedCursorFilter, isFeedCursor, nextFeedCursor, type FeedCursor } from '../feed/cursor.ts'
import type { FeedPost } from '../feed/types.ts'
import {
  applyDiscoverFiltersToQuery,
  discoverOrderColumn,
  discoverTableForKind,
  type DiscoverListKind,
} from './discoverQuery.ts'
import type { DiscoverFilterParams } from './filterParams.ts'

type CreationType = Database['public']['Enums']['creation_type']

type DiscoverTable = 'discover_trending_creations' | 'discover_new_creations' | 'discover_top_week_creations'

const DISCOVER_COLUMNS =
  'id, type, title, caption, body_excerpt, body_truncated, cover_url, genre, mood, language, country, published_at, like_count, comment_count, save_count, created_at, author_id, engagement_score' as const

const DISCOVER_COLUMNS_NO_SCORE =
  'id, type, title, caption, body_excerpt, body_truncated, cover_url, genre, mood, language, country, published_at, like_count, comment_count, save_count, created_at, author_id' as const

export const DISCOVER_PAGE_SIZE = 12

export type DiscoverListResult =
  | { ok: true; data: { posts: FeedPost[]; nextCursor: FeedCursor | null } }
  | { ok: false; error: { code: string; message: string } }

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

async function authorsById(ids: string[]): Promise<Map<string, CreationAuthor>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase
    .from('profiles_public')
    .select('id, username, display_name, avatar_url, verified')
    .in('id', unique)
  if (error) return new Map()
  const map = new Map<string, CreationAuthor>()
  for (const row of data ?? []) {
    const author = parseAuthor(row)
    if (author) map.set(author.id, author)
  }
  return map
}

function mapRow(
  row: Record<string, unknown>,
  author: CreationAuthor | undefined,
): { id: string; publishedAt: string; post: FeedPost } | null {
  const id = text(row.id)
  const publishedAt = text(row.published_at)
  const type = row.type
  const createdAt = text(row.created_at)
  if (!id || !publishedAt || !createdAt || !author || typeof type !== 'string') return null
  return {
    id,
    publishedAt,
    post: {
      id,
      type: type as FeedPost['type'],
      title: text(row.title),
      caption: text(row.caption),
      bodyExcerpt: text(row.body_excerpt),
      bodyTruncated: row.body_truncated === true,
      status: 'published',
      audience: 'public',
      coverUrl: text(row.cover_url),
      createdAt,
      publishedAt,
      author,
      likeCount: typeof row.like_count === 'number' ? row.like_count : 0,
      commentCount: typeof row.comment_count === 'number' ? row.comment_count : 0,
      saveCount: typeof row.save_count === 'number' ? row.save_count : 0,
      likedByViewer: false,
      savedByViewer: false,
      tags: [],
    },
  }
}

export async function listDiscoverPosts(
  kind: DiscoverListKind,
  filters: DiscoverFilterParams,
  cursor: FeedCursor | null,
): Promise<DiscoverListResult> {
  if (cursor && !isFeedCursor(cursor)) {
    return { ok: false, error: { code: 'invalid', message: 'We could not load the next page.' } }
  }

  const table = discoverTableForKind(kind, filters) as DiscoverTable
  const order = discoverOrderColumn(table)
  const filterFields = applyDiscoverFiltersToQuery(filters, kind)
  const columns = table === 'discover_trending_creations' ? DISCOVER_COLUMNS : DISCOVER_COLUMNS_NO_SCORE

  let query = supabase
    .from(table)
    .select(columns)
    .order(order.column, { ascending: order.ascending })
    .order('id', { ascending: false })
    .limit(DISCOVER_PAGE_SIZE + 1)

  if (filterFields.mood) query = query.eq('mood', filterFields.mood)
  if (filterFields.language) query = query.eq('language', filterFields.language)
  if (filterFields.country) query = query.eq('country', filterFields.country)
  if (filterFields.type) query = query.eq('type', filterFields.type as CreationType)
  if (filterFields.genre && !filterFields.type) query = query.ilike('genre', filterFields.genre)

  const filter = feedCursorFilter(cursor)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) {
    return {
      ok: false,
      error: { code: 'unavailable', message: 'We could not load Discover. Try again.', ...providerFields(error) },
    }
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const authorMap = await authorsById(
    rows.flatMap((row) => {
      const id = text(row.author_id)
      return id ? [id] : []
    }),
  )

  const mapped = rows.flatMap((row) => {
    const authorId = text(row.author_id)
    const entry = mapRow(row, authorId ? authorMap.get(authorId) : undefined)
    return entry ? [entry] : []
  })

  const { page, nextCursor } = nextFeedCursor(mapped)
  return { ok: true, data: { posts: page.map((e) => e.post), nextCursor } }
}

export type FeaturedWriter = {
  writerId: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
  bio: string | null
  followerCount: number
}

export async function listFeaturedWriters(): Promise<
  { ok: true; data: FeaturedWriter[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('founder_featured_writers_public')
    .select('writer_id, username, display_name, avatar_url, verified, bio, follower_count')
    .order('sort_order', { ascending: true })

  if (error) return { ok: false, message: 'We could not load featured writers.' }

  const rows =
    data?.map((row) => ({
      writerId: row.writer_id as string,
      username: row.username as string,
      displayName: (row.display_name as string) ?? '',
      avatarUrl: (row.avatar_url as string | null) ?? null,
      verified: row.verified === true,
      bio: (row.bio as string | null) ?? null,
      followerCount: typeof row.follower_count === 'number' ? row.follower_count : 0,
    })) ?? []

  return { ok: true, data: rows }
}

export type RisingWriter = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
  followerCount: number
  momentumScore: number
}

export async function listRisingWriters(): Promise<
  { ok: true; data: RisingWriter[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('discover_rising_writers')
    .select('id, username, display_name, avatar_url, verified, follower_count, momentum_score')
    .order('momentum_score', { ascending: false })
    .limit(12)

  if (error) return { ok: false, message: 'We could not load rising voices.' }

  return {
    ok: true,
    data:
      data?.map((row) => ({
        id: row.id as string,
        username: row.username as string,
        displayName: (row.display_name as string) ?? '',
        avatarUrl: (row.avatar_url as string | null) ?? null,
        verified: row.verified === true,
        followerCount: typeof row.follower_count === 'number' ? row.follower_count : 0,
        momentumScore: typeof row.momentum_score === 'number' ? row.momentum_score : 0,
      })) ?? [],
  }
}

export async function fetchDailyWritingPrompt(): Promise<{ ok: true; prompt: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('writing_prompt_for_date')
  if (error || !data) return { ok: false, message: 'We could not load today’s writing prompt.' }
  return { ok: true, prompt: String(data) }
}
