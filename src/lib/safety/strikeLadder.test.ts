import { describe, expect, it } from 'vitest'
import {
  AUTO_HIDE_FLAGGED_POSTS_FOR_FINAL_WARNING,
  STRIKE_LADDER_ACCOUNT_SUSPENSION_DAYS,
  STRIKE_LADDER_POST_SUSPENSION_DAYS,
} from '../../config/moderation.ts'
import {
  accountSuspensionEndsAt,
  postSuspensionEndsAt,
  shouldApplyAccountSuspension,
  shouldApplyPostSuspension,
  strikesAfterPostSuspension,
} from './strikeLadder.ts'

describe('strikeLadder', () => {
  it('issues final warning at two hidden posts, not before', () => {
    expect(AUTO_HIDE_FLAGGED_POSTS_FOR_FINAL_WARNING).toBe(2)
    expect(shouldApplyPostSuspension(1)).toBe(false)
    expect(shouldApplyPostSuspension(2)).toBe(false)
  })

  it('applies post suspension after more than two auto-hidden posts', () => {
    expect(shouldApplyPostSuspension(3)).toBe(true)
    expect(STRIKE_LADDER_POST_SUSPENSION_DAYS).toBe(7)
    const from = new Date('2026-01-01T12:00:00Z')
    const until = postSuspensionEndsAt(from)
    expect(until.toISOString()).toBe('2026-01-08T12:00:00.000Z')
  })

  it('does not account-suspend before second post suspension or below five strikes', () => {
    expect(
      shouldApplyAccountSuspension({ strikeCount: 5, postSuspensionCount: 1 }),
    ).toBe(false)
    expect(
      shouldApplyAccountSuspension({ strikeCount: 4, postSuspensionCount: 2 }),
    ).toBe(false)
  })

  it('applies account suspension at five strikes with at least two post suspensions', () => {
    expect(
      shouldApplyAccountSuspension({ strikeCount: 5, postSuspensionCount: 2 }),
    ).toBe(true)
    expect(STRIKE_LADDER_ACCOUNT_SUSPENSION_DAYS).toBe(7)
    const from = new Date('2026-06-01T00:00:00Z')
    const until = accountSuspensionEndsAt(from)
    expect(until.toISOString()).toBe('2026-06-08T00:00:00.000Z')
  })

  it('increments strike and post suspension counts on each post suspension', () => {
    const next = strikesAfterPostSuspension({
      strikeCount: 4,
      postSuspensionCount: 1,
      postSuspendedUntil: null,
    })
    expect(next.strikeCount).toBe(5)
    expect(next.postSuspensionCount).toBe(2)
    expect(next.postSuspendedUntil).toBeInstanceOf(Date)
    expect(shouldApplyAccountSuspension(next)).toBe(true)
  })
})
