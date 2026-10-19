import { describe, expect, it } from 'vitest'
import { pickMostPlayed } from './pickMostPlayed.ts'

describe('pickMostPlayed', () => {
  it('returns null until play metrics exist', () => {
    expect(
      pickMostPlayed([
        {
          id: '1',
          type: 'poem',
          title: 'A',
          coverUrl: null,
          publishedAt: '2026-01-01T00:00:00.000Z',
          audience: 'public',
          likeCount: 0,
          commentCount: 0,
          bodyText: null,
          bodyJson: null,
        },
      ]),
    ).toBeNull()
  })
})
