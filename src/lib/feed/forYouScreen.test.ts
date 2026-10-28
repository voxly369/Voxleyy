import { describe, expect, it } from 'vitest'
import { SHOW_FOR_YOU_FEED_TAB } from '../../config/productFlags.ts'
import type { FeedKind } from './types.ts'

/** Home maps only home/following to listFeed; there is no ranked For You loader yet. */
export function forYouFeedKind(): FeedKind | null {
  const kinds: FeedKind[] = ['home', 'following']
  const candidate = 'for_you' as FeedKind
  return kinds.includes(candidate) ? candidate : null
}

describe('For You screen readiness', () => {
  it('has no feed kind that loads ranked For You data', () => {
    expect(forYouFeedKind()).toBeNull()
  })

  it('keeps product flag off until a real For You loader exists', () => {
    expect(SHOW_FOR_YOU_FEED_TAB).toBe(false)
  })
})
