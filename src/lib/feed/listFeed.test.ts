import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabaseClient.ts', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            limit: () => ({
              then: (fn: (v: { data: unknown[]; error: null }) => unknown) =>
                Promise.resolve(fn({ data: [], error: null })),
            }),
          }),
        }),
      }),
    }),
  },
}))

describe('listFeed', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects malformed cursors', async () => {
    const { listFeed } = await import('./listFeed.ts')
    const result = await listFeed('home', { publishedAt: 'bad', id: 'not-uuid' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid')
  })
})
