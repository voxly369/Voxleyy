import { describe, expect, it } from 'vitest'
import { displayBadgesForFeed } from './displayBadgesForFeed.ts'

describe('displayBadgesForFeed', () => {
  it('returns at most two badges sorted by sort order', () => {
    expect(
      displayBadgesForFeed([
        { badgeKey: 'b', iconKey: 'badge', sortOrder: 2 },
        { badgeKey: 'a', iconKey: 'badge', sortOrder: 1 },
        { badgeKey: 'c', iconKey: 'badge', sortOrder: 3 },
      ]).map((b) => b.badgeKey),
    ).toEqual(['a', 'b'])
  })
})
