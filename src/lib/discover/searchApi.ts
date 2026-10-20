import { supabase } from '../supabaseClient.ts'
import { sanitizeSearchInput } from './searchInput.ts'

export type SearchTab = 'top' | 'writers' | 'posts' | 'tags'

export type SearchWriterHit = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
  followerCount: number
}

export type SearchPostHit = {
  id: string
  type: string
  title: string | null
  caption: string | null
  bodyExcerpt: string | null
  bodyTruncated: boolean
  publishedAt: string
  likeCount: number
  author: { username: string; displayName: string; avatarUrl: string | null; verified: boolean }
}

export type SearchTagHit = { tag: string; postCount: number }

export type SearchResults = {
  writers: SearchWriterHit[]
  posts: SearchPostHit[]
  tags: SearchTagHit[]
}

export async function runSearch(query: string, tab: SearchTab): Promise<
  { ok: true; data: SearchResults } | { ok: false; message: string }
> {
  const safe = sanitizeSearchInput(query)
  const { data, error } = await supabase.rpc('search_discovery', { p_query: safe, p_tab: tab, p_limit: 20 })
  if (error) {
    const msg =
      error.message.includes('too fast') ? 'You are searching too fast. Wait a moment and try again.' : 'Search did not work. Try again.'
    return { ok: false, message: msg }
  }

  const payload = (data ?? {}) as Record<string, unknown>
  const writers = Array.isArray(payload.writers) ? payload.writers : []
  const posts = Array.isArray(payload.posts) ? payload.posts : []
  const tags = Array.isArray(payload.tags) ? payload.tags : []

  return {
    ok: true,
    data: {
      writers: writers.map((row) => {
        const w = row as Record<string, unknown>
        return {
          id: String(w.id),
          username: String(w.username),
          displayName: String(w.display_name ?? ''),
          avatarUrl: typeof w.avatar_url === 'string' ? w.avatar_url : null,
          verified: w.verified === true,
          followerCount: typeof w.follower_count === 'number' ? w.follower_count : 0,
        }
      }),
      posts: posts.map((row) => {
        const p = row as Record<string, unknown>
        return {
          id: String(p.id),
          type: String(p.type),
          title: typeof p.title === 'string' ? p.title : null,
          caption: typeof p.caption === 'string' ? p.caption : null,
          bodyExcerpt: typeof p.body_excerpt === 'string' ? p.body_excerpt : null,
          bodyTruncated: p.body_truncated === true,
          publishedAt: String(p.published_at),
          likeCount: typeof p.like_count === 'number' ? p.like_count : 0,
          author: {
            username: String(p.author_username),
            displayName: String(p.author_display_name ?? ''),
            avatarUrl: typeof p.author_avatar_url === 'string' ? p.author_avatar_url : null,
            verified: p.author_verified === true,
          },
        }
      }),
      tags: tags.map((row) => {
        const t = row as Record<string, unknown>
        return { tag: String(t.tag), postCount: typeof t.post_count === 'number' ? t.post_count : 0 }
      }),
    },
  }
}
