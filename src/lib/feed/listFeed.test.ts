import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  tables: [] as string[],
  filters: [] as string[],
}))

function makeFeedBuilder(table: string) {
  state.tables.push(table)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.order = () => chain
  chain.limit = () => chain
  chain.or = (filter: string) => {
    state.filters.push(filter)
    return chain
  }
  chain.in = (column: string, values: string[]) => {
    state.filters.push(`in:${column}:${values.join(',')}`)
    return chain
  }
  chain.eq = () => chain
  chain.then = (onFulfilled: (value: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve({
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          type: 'poem',
          title: 'Long',
          caption: null,
          body_excerpt: 'x'.repeat(400),
          body_truncated: true,
          cover_url: null,
          audience: 'public',
          published_at: '2026-10-18T22:37:04.123456+00:00',
          like_count: 0,
          comment_count: 0,
          save_count: 0,
          created_at: '2026-10-18T22:37:04.123456+00:00',
          author_id: '22222222-2222-4222-8222-222222222222',
          author: {
            id: '22222222-2222-4222-8222-222222222222',
            username: 'writer',
            display_name: 'Writer',
            avatar_url: null,
            verified: false,
          },
        },
      ],
      error: null,
    }).then(onFulfilled)
  return chain
}

vi.mock('../supabaseClient.ts', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    from: (table: string) => {
      if (table === 'likes' || table === 'saves' || table === 'creation_tags') {
        const empty: Record<string, unknown> = {}
        empty.select = () => empty
        empty.eq = () => empty
        empty.in = () => empty
        empty.then = (fn: (v: { data: unknown[]; error: null }) => unknown) =>
          Promise.resolve(fn({ data: [], error: null }))
        return empty
      }
      return makeFeedBuilder(table)
    },
  },
}))

describe('listFeed', () => {
  beforeEach(() => {
    state.tables = []
    state.filters = []
    vi.resetModules()
  })

  it('rejects malformed cursors', async () => {
    const { listFeed } = await import('./listFeed.ts')
    const result = await listFeed('home', { publishedAt: 'bad', id: 'not-uuid' })
    expect(result.ok).toBe(false)
  })

  it('following feed reads following_feed only and never queries follows or author_id in', async () => {
    const { listFeed } = await import('./listFeed.ts')
    const result = await listFeed('following', null)
    expect(result.ok).toBe(true)
    expect(state.tables).toContain('following_feed')
    expect(state.tables.some((t) => t === 'follows')).toBe(false)
    expect(state.filters.some((f) => f.startsWith('in:author_id'))).toBe(false)
  })

  it('maps body excerpt and truncated flag from the feed view', async () => {
    const { listFeed } = await import('./listFeed.ts')
    const result = await listFeed('home', null)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.posts[0]?.bodyExcerpt).toHaveLength(400)
      expect(result.data.posts[0]?.bodyTruncated).toBe(true)
    }
  })
})
