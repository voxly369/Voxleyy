import { describe, expect, it } from 'vitest'
import { pickMostPlayed } from './pickMostPlayed.ts'

function work(id: string, viewCount: number, publishedAt: string) {
  return {
    id,
    type: 'poem' as const,
    title: id,
    coverUrl: null,
    publishedAt,
    audience: 'public' as const,
    likeCount: 0,
    commentCount: 0,
    viewCount,
    bodyText: null,
    bodyJson: null,
  }
}

describe('pickMostPlayed', () => {
  it('returns null when no views recorded', () => {
    expect(pickMostPlayed([work('1', 0, '2026-01-01T00:00:00.000Z')])).toBeNull()
  })

  it('picks highest view_count and breaks ties by publishedAt', () => {
    expect(
      pickMostPlayed([
        work('a', 10, '2026-01-01T00:00:00.000Z'),
        work('b', 25, '2026-01-02T00:00:00.000Z'),
        work('c', 25, '2026-01-03T00:00:00.000Z'),
      ])?.id,
    ).toBe('c')
  })
})
