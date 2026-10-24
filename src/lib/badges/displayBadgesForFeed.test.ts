import { describe, expect, it } from 'vitest'
import { displayBadgesBesideName } from './displayBadgesForFeed.ts'

describe('displayBadgesBesideName', () => {
  it('uses Founder and Verified slots for the Founder account', () => {
    const badges = [
      { badgeKey: 'founder', iconKey: 'founder', sortOrder: 0 },
      { badgeKey: 'poet', iconKey: 'quill', sortOrder: 1 },
    ]
    const visible = displayBadgesBesideName(badges, true)
    expect(visible.map((b) => b.badgeKey)).toEqual(['founder', 'verified'])
  })
})
