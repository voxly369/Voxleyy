import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  eqCalls: [] as [string, string][],
  viewerId: 'viewer-1' as string | null,
  profileId: 'author-1',
}))

function makeBuilder() {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = (column: string, value: string) => {
    state.eqCalls.push([column, value])
    return chain
  }
  chain.not = () => chain
  chain.or = () => chain
  chain.order = () => chain
  chain.limit = () => chain
  chain.then = (onFulfilled: (value: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled)
  return chain
}

vi.mock('../supabaseClient.ts', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: state.viewerId ? { user: { id: state.viewerId } } : null },
      }),
    },
    from: () => makeBuilder(),
  },
}))

describe('listUserPublished query filter', () => {
  beforeEach(() => {
    state.eqCalls = []
    state.viewerId = 'viewer-1'
    state.profileId = 'author-1'
    vi.resetModules()
  })

  it('filters audience to public when viewing someone else profile', async () => {
    const { listUserPublished } = await import('./api.ts')
    await listUserPublished('author-1', null)
    expect(state.eqCalls).toContainEqual(['audience', 'public'])
  })

  it('does not filter audience on own profile', async () => {
    state.viewerId = 'author-1'
    const { listUserPublished } = await import('./api.ts')
    await listUserPublished('author-1', null)
    expect(state.eqCalls.some(([column]) => column === 'audience')).toBe(false)
  })

  it('filters audience to public for a logged-out viewer on someone else profile', async () => {
    state.viewerId = null
    const { listUserPublished } = await import('./api.ts')
    await listUserPublished('author-1', null)
    expect(state.eqCalls).toContainEqual(['audience', 'public'])
  })
})
