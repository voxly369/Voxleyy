import { describe, expect, it } from 'vitest'
import { filterSuggestedWriters } from './suggestedWriters.ts'

describe('filterSuggestedWriters', () => {
  const rows = [
    { id: 'a', username: 'a', displayName: 'A', followerCount: 1 },
    { id: 'b', username: 'b', displayName: 'B', followerCount: 2 },
    { id: 'c', username: 'c', displayName: 'C', followerCount: 3 },
  ]

  it('removes self and already followed', () => {
    const out = filterSuggestedWriters(rows, {
      selfId: 'a',
      followingIds: new Set(['b']),
      blockedIds: new Set(),
    })
    expect(out.map((r) => r.id)).toEqual(['c'])
  })
})
