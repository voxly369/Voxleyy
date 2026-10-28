import { describe, expect, it, vi, beforeEach } from 'vitest'

const insertMock = vi.fn()

vi.mock('../supabaseClient.ts', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-a' } } } })) },
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}))

import { followUser } from './api.ts'

describe('followUser error mapping', () => {
  beforeEach(() => {
    insertMock.mockReset()
  })

  it('maps 42501 to follow not allowed message', async () => {
    insertMock.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } })
    const result = await followUser('user-b')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Follow is not allowed')
    }
  })

  it('maps 25006 to read-only message', async () => {
    insertMock.mockResolvedValue({ error: { code: '25006', message: 'read only' } })
    const result = await followUser('user-b')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('read-only')
    }
  })
})
