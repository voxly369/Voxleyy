import type { CreationAuthor } from '../creations/types.ts'
import { supabase } from '../supabaseClient.ts'
import type { FeedPost } from '../feed/types.ts'

export type CountryPageMeta = {
  code: string
  name: string
  primaryTimezone: string | null
  mainLanguages: string[]
  writerCount: number
  postCount: number
}

export type CountryBrowseRow = {
  code: string
  name: string
  primaryTimezone: string | null
}

export type CountryRisingWriter = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
  followerCount: number
  momentumScore: number
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

async function authorsById(ids: string[]): Promise<Map<string, CreationAuthor>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map()
  const { data } = await supabase
    .from('profiles_public')
    .select('id, username, display_name, avatar_url, verified')
    .in('id', unique)
  const map = new Map<string, CreationAuthor>()
  for (const row of data ?? []) {
    const id = text(row.id)
    const username = text(row.username)
    if (!id || !username) continue
    map.set(id, {
      id,
      username,
      displayName: text(row.display_name) ?? '',
      avatarUrl: text(row.avatar_url),
      verified: row.verified === true,
    })
  }
  return map
}

function mapTrendingRow(row: Record<string, unknown>, author: CreationAuthor | undefined): FeedPost | null {
  const id = text(row.id)
  const publishedAt = text(row.published_at)
  const createdAt = text(row.created_at)
  const type = row.type
  if (!id || !publishedAt || !createdAt || !author || typeof type !== 'string') return null
  return {
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
  }
}

export async function fetchCountryPage(code: string): Promise<
  { ok: true; data: CountryPageMeta } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('get_country_page', { p_code: code.toUpperCase() })
  if (error) return { ok: false, message: 'We could not load this country. Try again.' }
  const row = data as Record<string, unknown> | null
  if (!row?.code || !row?.name) return { ok: false, message: 'Country not found.' }
  const langs = row.main_languages
  return {
    ok: true,
    data: {
      code: String(row.code),
      name: String(row.name),
      primaryTimezone: text(row.primary_timezone),
      mainLanguages: Array.isArray(langs) ? langs.filter((l): l is string => typeof l === 'string') : [],
      writerCount: typeof row.writer_count === 'number' ? row.writer_count : 0,
      postCount: typeof row.post_count === 'number' ? row.post_count : 0,
    },
  }
}

export async function listCountryTrending(
  code: string,
  cursor: string | null,
): Promise<{ ok: true; posts: FeedPost[]; nextCursor: string | null } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('list_country_trending', {
    p_code: code.toUpperCase(),
    p_cursor: cursor,
    p_limit: 20,
  })
  if (error) return { ok: false, message: 'We could not load trending work. Try again.' }
  const payload = data as { rows?: unknown[]; next_cursor?: string | null } | null
  const rows = Array.isArray(payload?.rows) ? payload.rows : []
  const authorMap = await authorsById(
    rows.flatMap((row) => {
      const id = text((row as Record<string, unknown>).author_id)
      return id ? [id] : []
    }),
  )
  const posts = rows.flatMap((row) => {
    const record = row as Record<string, unknown>
    const authorId = text(record.author_id)
    const mapped = mapTrendingRow(record, authorId ? authorMap.get(authorId) : undefined)
    return mapped ? [mapped] : []
  })
  const next = payload?.next_cursor
  return { ok: true, posts, nextCursor: typeof next === 'string' ? next : null }
}

export async function listCountryRisingWriters(code: string): Promise<
  { ok: true; data: CountryRisingWriter[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('list_country_rising_writers', {
    p_code: code.toUpperCase(),
    p_limit: 12,
  })
  if (error) return { ok: false, message: 'We could not load rising writers.' }
  const payload = data as { rows?: unknown[] } | null
  const rows = Array.isArray(payload?.rows) ? payload.rows : []
  return {
    ok: true,
    data: rows.flatMap((row) => {
      const r = row as Record<string, unknown>
      const id = text(r.id)
      const username = text(r.username)
      if (!id || !username) return []
      return [
        {
          id,
          username,
          displayName: text(r.display_name) ?? username,
          avatarUrl: text(r.avatar_url),
          verified: r.verified === true,
          followerCount: typeof r.follower_count === 'number' ? r.follower_count : 0,
          momentumScore: typeof r.momentum_score === 'number' ? r.momentum_score : 0,
        },
      ]
    }),
  }
}

export async function listCountriesBrowse(
  query: string,
  cursor: string | null,
): Promise<{ ok: true; rows: CountryBrowseRow[]; nextCursor: string | null } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('list_countries_browse', {
    p_query: query.trim() || null,
    p_cursor: cursor,
    p_limit: 60,
  })
  if (error) return { ok: false, message: 'We could not load countries. Try again.' }
  const payload = data as { rows?: unknown[]; next_cursor?: string | null } | null
  const raw = Array.isArray(payload?.rows) ? payload.rows : []
  const rows = raw.flatMap((row) => {
    const r = row as Record<string, unknown>
    const code = text(r.code)
    const name = text(r.name)
    if (!code || !name) return []
    return [{ code, name, primaryTimezone: text(r.primary_timezone) }]
  })
  const next = payload?.next_cursor
  return { ok: true, rows, nextCursor: typeof next === 'string' ? next : null }
}
