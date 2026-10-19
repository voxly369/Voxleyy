import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  tagInsertFails: true,
  creationId: 'draft-same-id',
}))

function makeBuilder(table: string) {
  const ctx = { table, op: '' as string, payload: null as unknown }

  const chain: Record<string, unknown> = {}

  chain.insert = (payload: unknown) => {
    ctx.op = 'insert'
    ctx.payload = payload
    return chain
  }
  chain.update = (payload: unknown) => {
    ctx.op = 'update'
    ctx.payload = payload
    return chain
  }
  chain.delete = () => {
    ctx.op = 'delete'
    return chain
  }
  chain.select = () => {
    ctx.op = 'select'
    return chain
  }
  chain.eq = () => chain
  chain.in = () => chain
  chain.single = () => ({
    then(
      onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      if (table === 'creations' && (ctx.op === 'insert' || ctx.op === 'select')) {
        return Promise.resolve({
          data: {
            id: state.creationId,
            type: 'poem',
            title: 'Draft',
            caption: null,
            body_text: 'Body',
            status: 'draft',
            audience: 'private',
            cover_url: null,
            genre: null,
            mood: null,
            language: 'en',
            created_at: '2026-10-19T00:00:00Z',
            updated_at: '2026-10-19T00:00:00Z',
            author_id: 'user-1',
            author: {
              id: 'user-1',
              username: 'writer',
              display_name: 'Writer',
              avatar_url: null,
              verified: false,
            },
          },
          error: null,
        }).then(onFulfilled, onRejected)
      }
      return Promise.resolve({ data: null, error: { message: 'unexpected single' } }).then(onFulfilled, onRejected)
    },
  })
  chain.maybeSingle = () => ({
    then(
      onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      if (table === 'creations' && (ctx.op === 'update' || ctx.op === 'select')) {
        return Promise.resolve({ data: { updated_at: '2026-10-19T00:05:00Z' }, error: null }).then(onFulfilled, onRejected)
      }
      return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
    },
  })
  chain.then = (
    onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => {
    if (table === 'creation_tags' && ctx.op === 'select') {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected)
    }
    if (table === 'creation_tags' && ctx.op === 'insert') {
      const error = state.tagInsertFails ? { message: 'A creation can have at most 15 tags.' } : null
      return Promise.resolve({ data: null, error }).then(onFulfilled, onRejected)
    }
    return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
  }

  return chain
}

vi.mock('../supabaseClient.ts', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }),
    },
    from: (table: string) => makeBuilder(table),
  },
}))

describe('createDraft tag failure recovery', () => {
  beforeEach(() => {
    state.tagInsertFails = true
    state.creationId = 'draft-same-id'
    vi.resetModules()
  })

  it('returns the new draft when tag sync fails and a later save updates the same id', async () => {
    const { createDraft, saveCreationFields } = await import('./api.ts')
    const created = await createDraft({
      type: 'poem',
      title: 'Draft',
      body_text: 'Body',
      tags: ['one'],
    })

    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.data.id).toBe('draft-same-id')
    expect(created.tagError?.message).toMatch(/tags were not saved/i)

    state.tagInsertFails = false
    const updated = await saveCreationFields({
      id: created.data.id,
      expectedUpdatedAt: created.data.updatedAt,
      title: 'Draft',
      bodyText: 'Body v2',
      tags: ['one'],
    })
    expect(updated.ok).toBe(true)
    if (!updated.ok || 'conflict' in updated) return
    expect(updated.updatedAt).toBe('2026-10-19T00:05:00Z')
  })
})
